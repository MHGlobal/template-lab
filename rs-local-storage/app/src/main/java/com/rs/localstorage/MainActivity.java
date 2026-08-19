package com.rs.localstorage;

import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import java.io.File;
import java.util.List;

public class MainActivity extends Activity {
    TextView status, clientCount;
    EditText adminUser, adminPass;
    LinearLayout clientsBox;
    UserStore users;
    final Handler handler=new Handler(Looper.getMainLooper());
    final Runnable refresh=new Runnable(){public void run(){refreshStatus();handler.postDelayed(this,1200);}};

    @Override public void onCreate(Bundle b){super.onCreate(b);users=new UserStore(this);buildUi();}
    @Override protected void onResume(){super.onResume();refreshStatus();renderClients();handler.post(refresh);}
    @Override protected void onPause(){super.onPause();handler.removeCallbacks(refresh);}

    int dp(int v){return (int)(v*getResources().getDisplayMetrics().density+.5f);}
    GradientDrawable bg(int color,int radius){GradientDrawable g=new GradientDrawable();g.setColor(color);g.setCornerRadius(dp(radius));return g;}
    TextView txt(String s,int sp,int color){TextView t=new TextView(this);t.setText(s);t.setTextSize(sp);t.setTextColor(color);return t;}
    Button btn(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(15);b.setBackground(bg(Color.rgb(31,41,55),14));b.setTextColor(Color.WHITE);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(52));lp.setMargins(0,dp(7),0,0);b.setLayoutParams(lp);return b;}
    LinearLayout card(){LinearLayout c=new LinearLayout(this);c.setOrientation(LinearLayout.VERTICAL);c.setPadding(dp(18),dp(18),dp(18),dp(18));c.setBackground(bg(Color.WHITE,20));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,0,0,dp(14));c.setLayoutParams(lp);return c;}

    void buildUi(){
        getWindow().setStatusBarColor(Color.rgb(245,247,250));getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        ScrollView sc=new ScrollView(this);sc.setBackgroundColor(Color.rgb(245,247,250));
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(24),dp(20),dp(40));sc.addView(root);

        TextView title=txt("RS Local Storage",32,Color.rgb(17,24,39));title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);root.addView(title);
        TextView sub=txt("Storage privado + cinema local",15,Color.rgb(107,114,128));sub.setPadding(0,dp(3),0,dp(20));root.addView(sub);

        LinearLayout server=card();
        TextView h1=txt("Servidor",19,Color.rgb(17,24,39));h1.setTypeface(Typeface.DEFAULT,Typeface.BOLD);server.addView(h1);
        status=txt("Servidor parado",14,Color.rgb(75,85,99));status.setPadding(0,dp(10),0,dp(10));server.addView(status);
        Button start=btn("Iniciar servidor do hotspot");start.setOnClickListener(v->startSrv());server.addView(start);
        Button stop=btn("Parar servidor");stop.setBackground(bg(Color.rgb(229,231,235),14));stop.setTextColor(Color.rgb(31,41,55));stop.setOnClickListener(v->{stopService(new Intent(this,HotspotServerService.class));getSharedPreferences("rs",MODE_PRIVATE).edit().putString("status","Servidor parado").apply();refreshStatus();});server.addView(stop);
        Button test=btn("Testar no próprio telefone");test.setBackground(bg(Color.rgb(229,231,235),14));test.setTextColor(Color.rgb(31,41,55));test.setOnClickListener(v->{try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("http://127.0.0.1:8080")));}catch(Exception e){Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();}});server.addView(test);
        root.addView(server);

        LinearLayout admin=card();
        TextView h2=txt("Administrador",19,Color.rgb(17,24,39));h2.setTypeface(Typeface.DEFAULT,Typeface.BOLD);admin.addView(h2);
        TextView adesc=txt("O administrador vê todo o armazenamento e gere a biblioteca.",13,Color.rgb(107,114,128));adesc.setPadding(0,dp(4),0,dp(8));admin.addView(adesc);
        adminUser=new EditText(this);adminUser.setHint("Utilizador administrador");adminUser.setText(users.adminUser());admin.addView(adminUser);
        adminPass=new EditText(this);adminPass.setHint(users.hasAdmin()?"Nova palavra-passe (deixe vazio para manter)":"Palavra-passe (mínimo 6 caracteres)");adminPass.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);admin.addView(adminPass);
        Button saveAdmin=btn(users.hasAdmin()?"Guardar alterações do administrador":"Criar administrador");saveAdmin.setOnClickListener(v->saveAdmin());admin.addView(saveAdmin);
        Button perm=btn("Permitir acesso aos ficheiros");perm.setBackground(bg(Color.rgb(229,231,235),14));perm.setTextColor(Color.rgb(31,41,55));perm.setOnClickListener(v->requestAllFiles());admin.addView(perm);
        root.addView(admin);

        LinearLayout media=card();
        TextView h3=txt("Biblioteca de streaming",19,Color.rgb(17,24,39));h3.setTypeface(Typeface.DEFAULT,Typeface.BOLD);media.addView(h3);
        TextView mdesc=txt("Clientes só veem: /RS Media/Filmes e /RS Media/Series",13,Color.rgb(107,114,128));mdesc.setPadding(0,dp(4),0,dp(8));media.addView(mdesc);
        Button prep=btn("Criar / verificar biblioteca");prep.setOnClickListener(v->prepareLibrary(true));media.addView(prep);
        root.addView(media);

        LinearLayout clientCard=card();
        LinearLayout ch=new LinearLayout(this);ch.setOrientation(LinearLayout.HORIZONTAL);ch.setGravity(Gravity.CENTER_VERTICAL);
        TextView h4=txt("Clientes",19,Color.rgb(17,24,39));h4.setTypeface(Typeface.DEFAULT,Typeface.BOLD);ch.addView(h4,new LinearLayout.LayoutParams(0,-2,1));
        clientCount=txt("0/5",14,Color.rgb(107,114,128));ch.addView(clientCount);clientCard.addView(ch);
        TextView cdesc=txt("Até 5 contas. Cada cliente entra diretamente no RS Cinema e não vê os restantes ficheiros.",13,Color.rgb(107,114,128));cdesc.setPadding(0,dp(4),0,dp(8));clientCard.addView(cdesc);
        clientsBox=new LinearLayout(this);clientsBox.setOrientation(LinearLayout.VERTICAL);clientCard.addView(clientsBox);
        Button add=btn("+ Adicionar cliente");add.setOnClickListener(v->clientDialog(-1));clientCard.addView(add);
        root.addView(clientCard);

        TextView note=txt("Organização recomendada: Filmes podem ficar diretamente em ‘Filmes’. Para séries, use Series/Nome da Série/Temporada 01/episódios. A reprodução é feita diretamente do telefone pelo hotspot, sem Internet.",13,Color.rgb(107,114,128));note.setPadding(dp(4),dp(4),dp(4),0);root.addView(note);
        setContentView(sc);
    }

    void saveAdmin(){
        String u=adminUser.getText().toString().trim(),p=adminPass.getText().toString();
        if(u.isEmpty()){Toast.makeText(this,"Indique o utilizador administrador.",Toast.LENGTH_LONG).show();return;}
        if(!p.isEmpty()&&p.length()<6){Toast.makeText(this,"A palavra-passe deve ter pelo menos 6 caracteres.",Toast.LENGTH_LONG).show();return;}
        if(!users.hasAdmin()&&p.length()<6){Toast.makeText(this,"Crie primeiro uma palavra-passe com pelo menos 6 caracteres.",Toast.LENGTH_LONG).show();return;}
        if(users.usernameExists(u,-99)&&!users.adminUser().equalsIgnoreCase(u)){Toast.makeText(this,"Esse nome já está em uso por um cliente.",Toast.LENGTH_LONG).show();return;}
        if(p.isEmpty()){Toast.makeText(this,"Utilizador mantido. Para alterar credenciais, indique também uma nova palavra-passe.",Toast.LENGTH_LONG).show();return;}
        users.setAdmin(u,p);adminPass.setText("");Toast.makeText(this,"Administrador guardado.",Toast.LENGTH_SHORT).show();
    }

    void renderClients(){
        if(clientsBox==null)return;clientsBox.removeAllViews();List<UserStore.Client> list=users.clients();clientCount.setText(list.size()+"/5");
        if(list.isEmpty()){TextView e=txt("Ainda não existem clientes.",14,Color.rgb(107,114,128));e.setPadding(0,dp(8),0,dp(8));clientsBox.addView(e);return;}
        for(final UserStore.Client c:list){
            LinearLayout row=new LinearLayout(this);row.setGravity(Gravity.CENTER_VERTICAL);row.setPadding(dp(12),dp(10),dp(8),dp(10));row.setBackground(bg(Color.rgb(248,250,252),14));LinearLayout.LayoutParams rlp=new LinearLayout.LayoutParams(-1,-2);rlp.setMargins(0,dp(5),0,dp(5));row.setLayoutParams(rlp);
            LinearLayout labels=new LinearLayout(this);labels.setOrientation(LinearLayout.VERTICAL);TextView name=txt(c.username,15,Color.rgb(17,24,39));name.setTypeface(Typeface.DEFAULT,Typeface.BOLD);labels.addView(name);labels.addView(txt(c.enabled?"Ativo · Streaming":"Desativado",12,c.enabled?Color.rgb(5,150,105):Color.rgb(156,163,175)));row.addView(labels,new LinearLayout.LayoutParams(0,-2,1));
            Button edit=new Button(this);edit.setText("Editar");edit.setAllCaps(false);edit.setOnClickListener(v->clientDialog(c.slot));row.addView(edit,new LinearLayout.LayoutParams(dp(90),dp(46)));
            clientsBox.addView(row);
        }
    }

    void clientDialog(final int slot){
        if(slot<0&&users.countClients()>=UserStore.MAX_CLIENTS){Toast.makeText(this,"Limite de 5 clientes atingido.",Toast.LENGTH_LONG).show();return;}
        final int actual=slot<0?users.firstFreeSlot():slot;
        UserStore.Client found=null;for(UserStore.Client c:users.clients())if(c.slot==actual)found=c;
        final UserStore.Client ex=found;
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(22),dp(8),dp(22),0);
        final EditText u=new EditText(this);u.setHint("Nome do cliente");if(ex!=null)u.setText(ex.username);box.addView(u);
        final EditText pw=new EditText(this);pw.setHint(ex==null?"Palavra-passe (mínimo 6)":"Nova palavra-passe (opcional)");pw.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD);box.addView(pw);
        final CheckBox enabled=new CheckBox(this);enabled.setText("Conta ativa");enabled.setChecked(ex==null||ex.enabled);box.addView(enabled);
        AlertDialog.Builder b=new AlertDialog.Builder(this).setTitle(ex==null?"Adicionar cliente":"Editar cliente").setView(box).setNegativeButton("Cancelar",null).setPositiveButton("Guardar",null);
        if(ex!=null)b.setNeutralButton("Eliminar",null);
        final AlertDialog d=b.create();
        d.setOnShowListener(x->{
            d.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
                String name=u.getText().toString().trim(),pass=pw.getText().toString();
                if(name.isEmpty()){u.setError("Obrigatório");return;}
                if(ex==null&&pass.length()<6){pw.setError("Mínimo 6 caracteres");return;}
                if(!pass.isEmpty()&&pass.length()<6){pw.setError("Mínimo 6 caracteres");return;}
                if(users.usernameExists(name,actual)){u.setError("Nome já utilizado");return;}
                if(!users.saveClient(actual,name,pass,enabled.isChecked())){Toast.makeText(this,"Não foi possível guardar.",Toast.LENGTH_LONG).show();return;}
                d.dismiss();renderClients();
            });
            if(ex!=null){Button del=d.getButton(AlertDialog.BUTTON_NEUTRAL);del.setTextColor(Color.rgb(185,28,28));del.setOnClickListener(v->new AlertDialog.Builder(this).setTitle("Eliminar "+ex.username+"?").setMessage("A conta deixará de poder entrar no streaming.").setNegativeButton("Cancelar",null).setPositiveButton("Eliminar",(a,z)->{users.deleteClient(actual);d.dismiss();renderClients();}).show());}
        });
        d.show();
    }

    void prepareLibrary(boolean toast){
        File root=new File(Environment.getExternalStorageDirectory(),"RS Media");File movies=new File(root,"Filmes"),series=new File(root,"Series");boolean ok=(movies.exists()||movies.mkdirs())&&(series.exists()||series.mkdirs());if(toast)Toast.makeText(this,ok?"Biblioteca pronta em /RS Media":"Não foi possível criar a biblioteca.",Toast.LENGTH_LONG).show();
    }

    void refreshStatus(){if(status!=null)status.setText(getSharedPreferences("rs",MODE_PRIVATE).getString("status","Servidor parado"));}
    void requestAllFiles(){if(Build.VERSION.SDK_INT>=30&&!Environment.isExternalStorageManager()){startActivity(new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,Uri.parse("package:"+getPackageName())));}else Toast.makeText(this,"Acesso aos ficheiros já autorizado.",Toast.LENGTH_SHORT).show();}
    void startSrv(){
        if(!users.hasAdmin()){Toast.makeText(this,"Crie primeiro a conta de administrador.",Toast.LENGTH_LONG).show();return;}
        if(Build.VERSION.SDK_INT>=30&&!Environment.isExternalStorageManager()){Toast.makeText(this,"Primeiro permita acesso aos ficheiros.",Toast.LENGTH_LONG).show();requestAllFiles();return;}
        prepareLibrary(false);getSharedPreferences("rs",MODE_PRIVATE).edit().putString("status","A iniciar servidor...").apply();Intent i=new Intent(this,HotspotServerService.class);if(Build.VERSION.SDK_INT>=26)startForegroundService(i);else startService(i);refreshStatus();
    }
}
