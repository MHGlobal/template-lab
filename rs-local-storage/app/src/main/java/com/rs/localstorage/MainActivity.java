package com.rs.localstorage;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.text.InputType;
import android.widget.*;

public class MainActivity extends Activity {
    TextView status;
    EditText user, pass;
    final Handler handler = new Handler(Looper.getMainLooper());
    final Runnable refresh = new Runnable(){ public void run(){ refreshStatus(); handler.postDelayed(this,1000); } };

    @Override public void onCreate(Bundle b){ super.onCreate(b); buildUi(); }
    @Override protected void onResume(){ super.onResume(); refreshStatus(); handler.post(refresh); }
    @Override protected void onPause(){ super.onPause(); handler.removeCallbacks(refresh); }

    void buildUi(){
        ScrollView sc=new ScrollView(this);
        LinearLayout l=new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); l.setPadding(40,50,40,40);
        sc.addView(l);
        TextView title=new TextView(this); title.setText("RS Local Storage v2"); title.setTextSize(28); l.addView(title);
        status=new TextView(this); status.setText("Servidor parado"); status.setTextSize(16); status.setPadding(0,20,0,20); l.addView(status);
        user=new EditText(this); user.setHint("Utilizador"); user.setText("admin"); l.addView(user);
        pass=new EditText(this); pass.setHint("Palavra-passe (mínimo 6 caracteres)"); pass.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_VARIATION_PASSWORD); l.addView(pass);
        Button perm=new Button(this); perm.setText("Permitir acesso aos ficheiros"); perm.setOnClickListener(v->requestAllFiles()); l.addView(perm);
        Button start=new Button(this); start.setText("Iniciar servidor do hotspot"); start.setOnClickListener(v->startSrv()); l.addView(start);
        Button stop=new Button(this); stop.setText("Parar servidor"); stop.setOnClickListener(v->{stopService(new Intent(this,HotspotServerService.class)); getSharedPreferences("rs",MODE_PRIVATE).edit().putString("status","Servidor parado").apply(); refreshStatus();}); l.addView(stop);
        Button test=new Button(this); test.setText("Testar servidor neste telefone"); test.setOnClickListener(v->{try{startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("http://127.0.0.1:8080")));}catch(Exception e){Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();}}); l.addView(test);
        TextView help=new TextView(this); help.setPadding(0,24,0,0); help.setText(
            "Como usar:\n"+
            "1. Ligue o hotspot do telefone.\n"+
            "2. Conecte o PC ao hotspot.\n"+
            "3. Defina utilizador e palavra-passe.\n"+
            "4. Inicie o servidor.\n"+
            "5. No PC, abra um dos endereços mostrados acima, sempre com http:// e :8080.\n\n"+
            "Se houver vários endereços, no Windows use ipconfig e escolha o endereço correspondente ao Gateway Predefinido. Depois da primeira ligação válida, o app passa a mostrar o endereço confirmado.\n\n"+
            "Nesta v2: download e upload PC ↔ telefone estão ativos. Áreas privadas de outras apps continuam protegidas pelo Android."
        ); l.addView(help);
        setContentView(sc);
    }

    void refreshStatus(){
        if(status==null)return;
        String s=getSharedPreferences("rs",MODE_PRIVATE).getString("status","Servidor parado");
        status.setText(s);
    }

    void requestAllFiles(){
        if(Build.VERSION.SDK_INT>=30 && !Environment.isExternalStorageManager()){
            Intent i=new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:"+getPackageName())); startActivity(i);
        } else { Toast.makeText(this,"Acesso aos ficheiros já está autorizado.",Toast.LENGTH_SHORT).show(); }
    }

    void startSrv(){
        String u=user.getText().toString().trim(), p=pass.getText().toString();
        if(u.isEmpty()||p.length()<6){Toast.makeText(this,"Use utilizador e palavra-passe com pelo menos 6 caracteres",Toast.LENGTH_LONG).show(); return;}
        if(Build.VERSION.SDK_INT>=30 && !Environment.isExternalStorageManager()){
            Toast.makeText(this,"Primeiro permita acesso aos ficheiros.",Toast.LENGTH_LONG).show(); requestAllFiles(); return;
        }
        Intent i=new Intent(this,HotspotServerService.class); i.putExtra("user",u); i.putExtra("pass",p);
        getSharedPreferences("rs",MODE_PRIVATE).edit().putString("status","A iniciar servidor...").apply();
        if(Build.VERSION.SDK_INT>=26) startForegroundService(i); else startService(i);
        refreshStatus();
    }
}
