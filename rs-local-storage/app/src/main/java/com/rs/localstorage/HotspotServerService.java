package com.rs.localstorage;

import android.app.*;
import android.content.*;
import android.os.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public class HotspotServerService extends Service {
    volatile boolean running=false;
    ServerSocket ss;
    ExecutorService pool=Executors.newCachedThreadPool();
    String user;
    byte[] salt, passHash;
    final Map<String,Long> sessions=new ConcurrentHashMap<>();
    final Map<String,Integer> failures=new ConcurrentHashMap<>();
    final Map<String,Long> blocked=new ConcurrentHashMap<>();

    public IBinder onBind(Intent i){return null;}

    public int onStartCommand(Intent i,int f,int id){
        if(i!=null){
            user=i.getStringExtra("user");
            String p=i.getStringExtra("pass");
            if(p!=null){salt=new byte[16];new SecureRandom().nextBytes(salt);passHash=hash(p,salt);}
        }
        startForeground(77, notif("A iniciar servidor..."));
        if(!running) pool.submit(new Runnable(){public void run(){startServer();}});
        return START_NOT_STICKY;
    }

    void startServer(){
        try{
            ss=new ServerSocket();
            ss.setReuseAddress(true);
            ss.bind(new InetSocketAddress((InetAddress)null,8080));
            running=true;
            String addresses=privateUrls();
            setStatus("Servidor ativo na porta 8080.\n"+addresses+"\n\nLigue o PC ao hotspot e abra o endereço que corresponde ao Gateway Predefinido do PC.");
            updateNotif("Servidor ativo · porta 8080");
            while(running){
                final Socket s=ss.accept();
                pool.submit(new Runnable(){public void run(){handle(s);}});
            }
        }catch(Exception e){
            if(running) stopWith("Erro do servidor: "+e.getMessage()); else setStatus("Servidor parado");
        }
    }

    String privateUrls(){
        LinkedHashSet<String> urls=new LinkedHashSet<>();
        try{
            Enumeration<NetworkInterface> en=NetworkInterface.getNetworkInterfaces();
            while(en.hasMoreElements()){
                NetworkInterface ni=en.nextElement();
                if(!ni.isUp()||ni.isLoopback())continue;
                Enumeration<InetAddress> as=ni.getInetAddresses();
                while(as.hasMoreElements()){
                    InetAddress a=as.nextElement();
                    if(a instanceof Inet4Address && isPrivateV4(a)) urls.add("http://"+a.getHostAddress()+":8080");
                }
            }
        }catch(Exception ignored){}
        if(urls.isEmpty()) return "Nenhum IPv4 privado detetado ainda.";
        StringBuilder b=new StringBuilder("Endereços detetados:");
        for(String u:urls)b.append("\n").append(u);
        return b.toString();
    }

    boolean isPrivateV4(InetAddress a){
        if(!(a instanceof Inet4Address))return false;
        byte[] b=a.getAddress(); int x=b[0]&255, y=b[1]&255;
        return x==10 || (x==172 && y>=16 && y<=31) || (x==192 && y==168);
    }

    boolean allowed(Socket s){
        InetAddress remote=s.getInetAddress(), local=s.getLocalAddress();
        if(remote==null||local==null)return false;
        if(remote.isLoopbackAddress())return true;
        return isPrivateV4(remote) && isPrivateV4(local);
    }

    void handle(Socket s){
        try{
            if(!allowed(s)){safeClose(s);return;}
            s.setSoTimeout(30000);
            InputStream in=new BufferedInputStream(s.getInputStream());
            OutputStream out=new BufferedOutputStream(s.getOutputStream());
            String req=readLine(in); if(req==null){safeClose(s);return;}
            String[] parts=req.split(" "); if(parts.length<2){safeClose(s);return;}
            String method=parts[0].toUpperCase(Locale.US), target=parts[1];
            Map<String,String> h=new HashMap<>();
            String line;
            while((line=readLine(in))!=null && !line.isEmpty()){
                int k=line.indexOf(':'); if(k>0)h.put(line.substring(0,k).trim().toLowerCase(Locale.US),line.substring(k+1).trim());
            }
            int clen=parseInt(h.get("content-length"),0);
            String remoteIp=s.getInetAddress().getHostAddress(), localIp=s.getLocalAddress().getHostAddress();
            setConfirmedAddress(localIp,remoteIp);

            String path=target, query="";
            int q=target.indexOf('?'); if(q>=0){path=target.substring(0,q);query=target.substring(q+1);}
            path=URLDecoder.decode(path,"UTF-8");
            Map<String,String> qp=query(query);

            if(path.equals("/login") && method.equals("POST")){
                byte[] body=readExact(in,clen); doLogin(out,remoteIp,new String(body,StandardCharsets.UTF_8));
            } else if(!authed(h)){
                sendHtml(out,401,"Unauthorized",loginPage());
            } else if(path.equals("/download")){
                serveFile(out,safe(qp.get("f")));
            } else if(path.equals("/upload") && method.equals("POST")){
                receiveUpload(in,out,qp,clen);
            } else if(path.equals("/logout")){
                sessions.remove(cookie(h)); redirect(out,"/");
            } else {
                String rel=path.equals("/")?"":path.substring(1); listDir(out,safe(rel));
            }
            out.flush();
        }catch(Exception e){
            try{OutputStream out=s.getOutputStream();sendHtml(out,500,"Server Error","<h2>Erro interno</h2><p>"+esc(String.valueOf(e.getMessage()))+"</p>");out.flush();}catch(Exception ignored){}
        }finally{safeClose(s);}
    }

    void setConfirmedAddress(String localIp,String remoteIp){
        setStatus("Servidor ativo.\nEndereço CONFIRMADO para este hotspot:\nhttp://"+localIp+":8080\n\nÚltimo cliente: "+remoteIp+"\n\n"+privateUrls());
        updateNotif("Abrir no PC: http://"+localIp+":8080");
    }

    String readLine(InputStream in)throws IOException{
        ByteArrayOutputStream b=new ByteArrayOutputStream(); int c,prev=-1;
        while((c=in.read())!=-1){
            if(prev=='\r'&&c=='\n'){byte[] x=b.toByteArray();int n=x.length;if(n>0&&x[n-1]=='\r')n--;return new String(x,0,n,StandardCharsets.ISO_8859_1);} b.write(c); prev=c; if(b.size()>16384)throw new IOException("Cabeçalho demasiado grande");
        }
        if(b.size()==0)return null; return new String(b.toByteArray(),StandardCharsets.ISO_8859_1);
    }

    byte[] readExact(InputStream in,int len)throws IOException{
        byte[] b=new byte[len];int off=0,n;while(off<len&&(n=in.read(b,off,len-off))>0)off+=n;if(off<len)throw new EOFException("Pedido incompleto");return b;
    }
    int parseInt(String s,int d){try{return s==null?d:Integer.parseInt(s);}catch(Exception e){return d;}}

    void doLogin(OutputStream out,String ip,String body)throws Exception{
        long now=System.currentTimeMillis();
        if(blocked.containsKey(ip)&&blocked.get(ip)>now){sendHtml(out,429,"Too Many Requests","<h2>Tente novamente em alguns minutos.</h2>");return;}
        Map<String,String> f=form(body); String u=f.containsKey("u")?f.get("u"):"", p=f.containsKey("p")?f.get("p"):"";
        if(user!=null&&passHash!=null&&user.equals(u)&&MessageDigest.isEqual(passHash,hash(p,salt))){
            failures.remove(ip);String t=UUID.randomUUID().toString()+UUID.randomUUID();sessions.put(t,now+3600000L);
            sendRaw(out,"HTTP/1.1 302 Found\r\nSet-Cookie: RSSESSION="+t+"; HttpOnly; SameSite=Strict\r\nLocation: /\r\nCache-Control: no-store\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
        } else {
            int n=failures.containsKey(ip)?failures.get(ip)+1:1;failures.put(ip,n);if(n>=5){blocked.put(ip,now+300000L);failures.remove(ip);}sendHtml(out,401,"Unauthorized",loginPage()+"<p style='color:#b00020'>Credenciais inválidas.</p>");
        }
    }

    boolean authed(Map<String,String> h){String c=cookie(h);Long exp=c==null?null:sessions.get(c);if(exp==null||exp<System.currentTimeMillis()){if(c!=null)sessions.remove(c);return false;}sessions.put(c,System.currentTimeMillis()+3600000L);return true;}
    String cookie(Map<String,String> h){String c=h.get("cookie");if(c==null)return null;for(String x:c.split(";")){x=x.trim();if(x.startsWith("RSSESSION="))return x.substring(10);}return null;}
    File root(){return Environment.getExternalStorageDirectory();}

    File safe(String rel)throws IOException{
        if(rel==null)rel="";rel=URLDecoder.decode(rel,"UTF-8");File r=root().getCanonicalFile(),f=new File(r,rel).getCanonicalFile();String rp=r.getPath(),fp=f.getPath();if(!fp.equals(rp)&&!fp.startsWith(rp+File.separator))throw new SecurityException("Caminho bloqueado");return f;
    }

    void listDir(OutputStream out,File d)throws Exception{
        if(!d.exists()||!d.isDirectory()){sendHtml(out,404,"Not Found","<h2>Pasta não encontrada</h2>");return;}
        String current=root().toURI().relativize(d.toURI()).getPath();
        StringBuilder b=new StringBuilder();
        b.append("<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'><meta charset='utf-8'><title>RS Local Storage</title><style>");
        b.append("body{font-family:Arial,sans-serif;background:#f6f7f9;color:#202124;margin:0}.wrap{max-width:920px;margin:auto;padding:18px}.top{display:flex;align-items:center;justify-content:space-between}.card{background:#fff;border-radius:14px;padding:14px;margin:12px 0;box-shadow:0 1px 4px #0002}a.item{display:flex;padding:12px 6px;border-bottom:1px solid #eee;text-decoration:none;color:#202124}.muted{color:#6b7280;font-size:13px}button{padding:10px 16px;border:0;border-radius:9px}input{max-width:100%}</style></head><body><div class='wrap'>");
        b.append("<div class='top'><div><h2>RS Local Storage</h2><div class='muted'>Memória partilhada privada</div></div><a href='/logout'>Sair</a></div>");
        b.append("<div class='card'><b>Enviar ficheiro do PC para esta pasta</b><br><br><input id='up' type='file' multiple><button onclick='uploadFiles()'>Enviar</button><div id='msg' class='muted'></div></div><div class='card'>");
        if(!d.getCanonicalFile().equals(root().getCanonicalFile())){File parent=d.getParentFile();String pr=root().toURI().relativize(parent.toURI()).getPath();b.append("<a class='item' href='/").append(urlPath(pr)).append("'>⬅ Voltar</a>");}
        File[] fs=d.listFiles();
        if(fs!=null){Arrays.sort(fs,new Comparator<File>(){public int compare(File a,File c){if(a.isDirectory()!=c.isDirectory())return a.isDirectory()?-1:1;return a.getName().compareToIgnoreCase(c.getName());}});for(File f:fs){String rel=root().toURI().relativize(f.toURI()).getPath();if(f.isDirectory())b.append("<a class='item' href='/").append(urlPath(rel)).append("'>📁 ").append(esc(f.getName())).append("</a>");else b.append("<a class='item' href='/download?f=").append(url(rel)).append("'>📄 ").append(esc(f.getName())).append(" <span class='muted'>&nbsp;·&nbsp;").append(size(f.length())).append("</span></a>");}}
        b.append("</div><script>async function uploadFiles(){let f=document.getElementById('up').files,m=document.getElementById('msg');if(!f.length){m.textContent='Escolha um ficheiro.';return;}for(let x of f){m.textContent='A enviar '+x.name+'...';let r=await fetch('/upload?d=").append(url(current)).append("&name='+encodeURIComponent(x.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:x});if(!r.ok){m.textContent='Falha: '+x.name;return;}}m.textContent='Concluído.';setTimeout(()=>location.reload(),600);}</script></div></body></html>");
        sendHtml(out,200,"OK",b.toString());
    }

    void receiveUpload(InputStream in,OutputStream out,Map<String,String> qp,int len)throws Exception{
        String dir=qp.get("d"),name=qp.get("name");if(name==null||name.trim().isEmpty()){sendHtml(out,400,"Bad Request","<h2>Nome de ficheiro inválido.</h2>");return;}name=new File(name).getName();File d=safe(dir);if(!d.exists()||!d.isDirectory()){sendHtml(out,400,"Bad Request","<h2>Pasta inválida.</h2>");return;}File dest=new File(d,name).getCanonicalFile(),rootCanonical=root().getCanonicalFile();if(!dest.getPath().startsWith(rootCanonical.getPath()+File.separator))throw new SecurityException("Destino bloqueado");dest=unique(dest);FileOutputStream fos=new FileOutputStream(dest);try{byte[] buf=new byte[65536];int remain=len;while(remain>0){int n=in.read(buf,0,Math.min(buf.length,remain));if(n<0)throw new EOFException("Upload incompleto");fos.write(buf,0,n);remain-=n;}}finally{fos.close();}sendHtml(out,200,"OK","<h2>Upload concluído</h2><p>"+esc(dest.getName())+"</p>");
    }

    File unique(File f){if(!f.exists())return f;String n=f.getName(),base=n,ext="";int dot=n.lastIndexOf('.');if(dot>0){base=n.substring(0,dot);ext=n.substring(dot);}int i=1;File p=f.getParentFile(),c;do{c=new File(p,base+" ("+i+")"+ext);i++;}while(c.exists());return c;}

    void serveFile(OutputStream out,File f)throws Exception{if(!f.exists()||!f.isFile()){sendHtml(out,404,"Not Found","<h2>Ficheiro não encontrado</h2>");return;}String head="HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename*=UTF-8''"+url(f.getName())+"\r\nContent-Length: "+f.length()+"\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";out.write(head.getBytes(StandardCharsets.UTF_8));InputStream fin=new FileInputStream(f);try{byte[] buf=new byte[65536];int n;while((n=fin.read(buf))>0)out.write(buf,0,n);}finally{fin.close();}}

    Map<String,String> form(String x)throws Exception{return query(x);}
    Map<String,String> query(String x)throws Exception{Map<String,String>m=new HashMap<>();if(x==null||x.isEmpty())return m;for(String p:x.split("&")){String[]kv=p.split("=",2);String k=URLDecoder.decode(kv[0],"UTF-8"),v=kv.length>1?URLDecoder.decode(kv[1],"UTF-8"):"";m.put(k,v);}return m;}
    String url(String s)throws Exception{return URLEncoder.encode(s==null?"":s,"UTF-8").replace("+","%20");}
    String urlPath(String s)throws Exception{if(s==null||s.isEmpty())return "";StringBuilder b=new StringBuilder();for(String p:s.split("/")){if(p.isEmpty())continue;if(b.length()>0)b.append('/');b.append(url(p));}if(s.endsWith("/"))b.append('/');return b.toString();}
    String size(long n){if(n<1024)return n+" B";if(n<1024*1024)return String.format(Locale.US,"%.1f KB",n/1024.0);if(n<1024L*1024L*1024L)return String.format(Locale.US,"%.1f MB",n/(1024.0*1024));return String.format(Locale.US,"%.1f GB",n/(1024.0*1024*1024));}

    String loginPage(){return "<!doctype html><html><meta name='viewport' content='width=device-width,initial-scale=1'><meta charset='utf-8'><style>body{font-family:Arial,sans-serif;background:#f6f7f9;display:grid;place-items:center;height:100vh;margin:0}.c{background:white;padding:24px;border-radius:16px;width:min(86%,360px);box-shadow:0 2px 12px #0002}input,button{width:100%;padding:14px;margin:8px 0;box-sizing:border-box}button{border:0;border-radius:9px}</style><div class='c'><h2>RS Local Storage</h2><p>Acesso privado via hotspot</p><form method='post' action='/login'><input name='u' autocomplete='username' placeholder='Utilizador'><input name='p' type='password' autocomplete='current-password' placeholder='Palavra-passe'><button>Entrar</button></form></div></html>";}
    String esc(String s){if(s==null)return "";return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");}
    void sendHtml(OutputStream out,int code,String reason,String html)throws Exception{byte[] b=html.getBytes(StandardCharsets.UTF_8);String h="HTTP/1.1 "+code+" "+reason+"\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: "+b.length+"\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";out.write(h.getBytes(StandardCharsets.UTF_8));out.write(b);}
    void redirect(OutputStream out,String loc)throws Exception{sendRaw(out,"HTTP/1.1 302 Found\r\nLocation: "+loc+"\r\nCache-Control: no-store\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");}
    void sendRaw(OutputStream out,String h)throws Exception{out.write(h.getBytes(StandardCharsets.UTF_8));}
    byte[] hash(String p,byte[]s){try{PBEKeySpec spec=new PBEKeySpec(p.toCharArray(),s,120000,256);return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();}catch(Exception e){throw new RuntimeException(e);}}
    Notification notif(String text){String ch="rsstorage";NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(new NotificationChannel(ch,"RS Local Storage",NotificationManager.IMPORTANCE_LOW));Notification.Builder b=Build.VERSION.SDK_INT>=26?new Notification.Builder(this,ch):new Notification.Builder(this);return b.setContentTitle("RS Local Storage").setContentText(text).setSmallIcon(android.R.drawable.stat_sys_upload_done).setOngoing(true).build();}
    void updateNotif(String t){((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(77,notif(t));}
    void setStatus(String t){getSharedPreferences("rs",MODE_PRIVATE).edit().putString("status",t).apply();}
    void stopWith(String t){setStatus(t);updateNotif(t);running=false;stopSelf();}
    void safeClose(Socket s){try{if(s!=null)s.close();}catch(Exception ignored){}}
    public void onDestroy(){running=false;try{if(ss!=null)ss.close();}catch(Exception ignored){}pool.shutdownNow();setStatus("Servidor parado");super.onDestroy();}
}
