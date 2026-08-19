package com.rs.localstorage;

import android.app.*;import android.content.*;import android.os.*;
import java.io.*;import java.net.*;import java.nio.charset.StandardCharsets;import java.security.*;import java.util.*;import java.util.concurrent.*;import javax.crypto.SecretKeyFactory;import javax.crypto.spec.PBEKeySpec;

public class HotspotServerService extends Service {
    volatile boolean running=false; ServerSocket ss; ExecutorService pool=Executors.newCachedThreadPool(); String user; byte[] salt, passHash; final Map<String,Long> sessions=new ConcurrentHashMap<>(); final Map<String,Integer> failures=new ConcurrentHashMap<>(); final Map<String,Long> blocked=new ConcurrentHashMap<>(); InetAddress bindAddr;
    public IBinder onBind(Intent i){return null;}
    public int onStartCommand(Intent i,int f,int id){
        if(i!=null){user=i.getStringExtra("user"); String p=i.getStringExtra("pass"); if(p!=null){salt=new byte[16];new SecureRandom().nextBytes(salt);passHash=hash(p,salt);}}
        startForeground(77, notif("A procurar hotspot...")); if(!running) pool.submit(this::startServer); return START_NOT_STICKY;
    }
    void startServer(){ try{
        bindAddr=findHotspotAddress(); if(bindAddr==null){stopWith("Hotspot não detetado. Ligue o hotspot e tente novamente.");return;}
        ss=new ServerSocket(); ss.bind(new InetSocketAddress(bindAddr,8080)); running=true; updateNotif("Servidor: http://"+bindAddr.getHostAddress()+":8080");
        while(running){Socket s=ss.accept(); pool.submit(()->handle(s));}
      }catch(Exception e){if(running) stopWith("Erro: "+e.getMessage());}
    }
    InetAddress findHotspotAddress() throws Exception{
        Enumeration<NetworkInterface> en=NetworkInterface.getNetworkInterfaces();
        while(en.hasMoreElements()){NetworkInterface ni=en.nextElement(); if(!ni.isUp()||ni.isLoopback())continue; String n=ni.getName().toLowerCase();
            if(!(n.contains("wlan")||n.contains("ap")||n.contains("swlan")||n.contains("softap")))continue;
            Enumeration<InetAddress> as=ni.getInetAddresses(); while(as.hasMoreElements()){InetAddress a=as.nextElement(); if(a instanceof Inet4Address && a.isSiteLocalAddress()){String ip=a.getHostAddress(); if(ip.startsWith("192.168.")||ip.startsWith("172.")||ip.startsWith("10.")) return a;}}
        } return null;
    }
    boolean sameSubnet(InetAddress client){ if(!(client instanceof Inet4Address)||bindAddr==null)return false; byte[] a=bindAddr.getAddress(),b=client.getAddress(); return a[0]==b[0]&&a[1]==b[1]&&a[2]==b[2]; }
    void handle(Socket s){ try(s){ if(!sameSubnet(s.getInetAddress()))return; s.setSoTimeout(15000); BufferedReader br=new BufferedReader(new InputStreamReader(s.getInputStream(),StandardCharsets.UTF_8)); String req=br.readLine(); if(req==null)return; String[] parts=req.split(" "); if(parts.length<2)return; String method=parts[0], path=URLDecoder.decode(parts[1],"UTF-8"); Map<String,String> h=new HashMap<>(); String line; int clen=0; while((line=br.readLine())!=null&&!line.isEmpty()){int k=line.indexOf(':'); if(k>0)h.put(line.substring(0,k).trim().toLowerCase(),line.substring(k+1).trim());} if(h.containsKey("content-length"))clen=Integer.parseInt(h.get("content-length")); OutputStream out=s.getOutputStream(); String ip=s.getInetAddress().getHostAddress();
            if(path.equals("/login")&&method.equals("POST")){char[] buf=new char[clen]; int r=br.read(buf,0,clen); String body=new String(buf,0,Math.max(0,r)); doLogin(out,ip,body);return;}
            if(!authed(h)){sendHtml(out,401,loginPage());return;}
            if(path.startsWith("/download?f=")){serveFile(out, safe(path.substring(12)));return;}
            if(path.startsWith("/logout")){sessions.remove(cookie(h)); redirect(out,"/");return;}
            listDir(out,safe(path.equals("/")?"":path.substring(1))); }
        catch(Exception ignored){}
    }
    void doLogin(OutputStream out,String ip,String body)throws Exception{ long now=System.currentTimeMillis(); if(blocked.getOrDefault(ip,0L)>now){sendHtml(out,429,"<h2>Tente novamente mais tarde.</h2>");return;} Map<String,String> f=form(body); String u=f.getOrDefault("u",""),p=f.getOrDefault("p",""); if(user.equals(u)&&MessageDigest.isEqual(passHash,hash(p,salt))){failures.remove(ip);String t=UUID.randomUUID().toString()+UUID.randomUUID();sessions.put(t,now+3600000); send(out,"HTTP/1.1 302 Found\r\nSet-Cookie: RSSESSION="+t+"; HttpOnly; SameSite=Strict\r\nLocation: /\r\nContent-Length: 0\r\n\r\n",null); } else {int n=failures.merge(ip,1,Integer::sum); if(n>=5){blocked.put(ip,now+300000);failures.remove(ip);} sendHtml(out,401,loginPage()+"<p>Credenciais inválidas.</p>");}}
    boolean authed(Map<String,String> h){String c=cookie(h); Long exp=sessions.get(c); if(exp==null||exp<System.currentTimeMillis()){if(c!=null)sessions.remove(c);return false;} sessions.put(c,System.currentTimeMillis()+3600000);return true;}
    String cookie(Map<String,String> h){String c=h.get("cookie");if(c==null)return null;for(String x:c.split(";")){x=x.trim();if(x.startsWith("RSSESSION="))return x.substring(10);}return null;}
    File root(){return Environment.getExternalStorageDirectory();}
    File safe(String rel)throws IOException{rel=URLDecoder.decode(rel,"UTF-8"); File r=root().getCanonicalFile(), f=new File(r,rel).getCanonicalFile(); if(!f.getPath().startsWith(r.getPath()+File.separator)&&!f.equals(r))throw new SecurityException(); return f;}
    void listDir(OutputStream out,File d)throws Exception{if(!d.exists()||!d.isDirectory()){sendHtml(out,404,"<h2>Pasta não encontrada</h2>");return;} StringBuilder b=new StringBuilder("<html><meta name='viewport' content='width=device-width'><style>body{font-family:sans-serif;max-width:900px;margin:auto;padding:20px}a{display:block;padding:10px;border-bottom:1px solid #ddd;text-decoration:none}.top{display:flex;justify-content:space-between}</style><div class='top'><h2>RS Local Storage</h2><a href='/logout'>Sair</a></div>"); if(!d.equals(root()))b.append("<a href='..'>⬅ Voltar</a>"); File[] fs=d.listFiles();if(fs!=null){Arrays.sort(fs,Comparator.comparing(File::isFile).thenComparing(File::getName,String.CASE_INSENSITIVE_ORDER));for(File f:fs){String rel=root().toURI().relativize(f.toURI()).getPath(); String enc=URLEncoder.encode(rel,"UTF-8").replace("+","%20"); if(f.isDirectory())b.append("<a href='/").append(rel).append("'>📁 ").append(esc(f.getName())).append("</a>"); else b.append("<a href='/download?f=").append(enc).append("'>📄 ").append(esc(f.getName())).append(" (download)</a>");}} b.append("</html>");sendHtml(out,200,b.toString());}
    void serveFile(OutputStream out,File f)throws Exception{if(!f.exists()||!f.isFile()){sendHtml(out,404,"Não encontrado");return;} String head="HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename*=UTF-8''"+URLEncoder.encode(f.getName(),"UTF-8")+"\r\nContent-Length: "+f.length()+"\r\n\r\n"; out.write(head.getBytes(StandardCharsets.UTF_8)); try(InputStream in=new FileInputStream(f)){byte[] buf=new byte[65536];int n;while((n=in.read(buf))>0)out.write(buf,0,n);}}
    Map<String,String> form(String x)throws Exception{Map<String,String>m=new HashMap<>();for(String p:x.split("&")){String[]kv=p.split("=",2);m.put(URLDecoder.decode(kv[0],"UTF-8"),kv.length>1?URLDecoder.decode(kv[1],"UTF-8"):"");}return m;}
    String loginPage(){return "<html><meta name='viewport' content='width=device-width'><style>body{font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0}.c{width:min(90%,360px)}input,button{width:100%;padding:14px;margin:8px 0;box-sizing:border-box}</style><div class='c'><h2>RS Local Storage</h2><p>Acesso privado via hotspot</p><form method='post' action='/login'><input name='u' placeholder='Utilizador'><input name='p' type='password' placeholder='Palavra-passe'><button>Entrar</button></form></div></html>";}
    String esc(String s){return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;");}
    void sendHtml(OutputStream out,int code,String html)throws Exception{byte[] b=html.getBytes(StandardCharsets.UTF_8); String h="HTTP/1.1 "+code+" OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: "+b.length+"\r\nConnection: close\r\n\r\n";out.write(h.getBytes(StandardCharsets.UTF_8));out.write(b);}
    void redirect(OutputStream out,String loc)throws Exception{send(out,"HTTP/1.1 302 Found\r\nLocation: "+loc+"\r\nContent-Length: 0\r\n\r\n",null);}
    void send(OutputStream out,String h,byte[]b)throws Exception{out.write(h.getBytes(StandardCharsets.UTF_8));if(b!=null)out.write(b);}
    byte[] hash(String p,byte[]s){try{PBEKeySpec spec=new PBEKeySpec(p.toCharArray(),s,120000,256);return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();}catch(Exception e){throw new RuntimeException(e);}}
    Notification notif(String text){String ch="rsstorage"; NotificationManager nm=getSystemService(NotificationManager.class); if(Build.VERSION.SDK_INT>=26)nm.createNotificationChannel(new NotificationChannel(ch,"RS Local Storage",NotificationManager.IMPORTANCE_LOW)); return new Notification.Builder(this,ch).setContentTitle("RS Local Storage").setContentText(text).setSmallIcon(android.R.drawable.stat_sys_upload_done).build();}
    void updateNotif(String t){getSystemService(NotificationManager.class).notify(77,notif(t));}
    void stopWith(String t){updateNotif(t);stopSelf();}
    public void onDestroy(){running=false;try{if(ss!=null)ss.close();}catch(Exception ignored){}pool.shutdownNow();super.onDestroy();}
}
