package com.rs.localstorage;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.widget.*;

public class MainActivity extends Activity {
    TextView status;
    EditText user, pass;
    @Override public void onCreate(Bundle b){super.onCreate(b); buildUi();}
    void buildUi(){
        LinearLayout l=new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); l.setPadding(40,50,40,40);
        TextView title=new TextView(this); title.setText("RS Local Storage"); title.setTextSize(28); l.addView(title);
        status=new TextView(this); status.setText("Servidor parado"); status.setPadding(0,20,0,20); l.addView(status);
        user=new EditText(this); user.setHint("Utilizador"); user.setText("admin"); l.addView(user);
        pass=new EditText(this); pass.setHint("Palavra-passe"); pass.setInputType(0x81); l.addView(pass);
        Button perm=new Button(this); perm.setText("Permitir acesso aos ficheiros"); perm.setOnClickListener(v->requestAllFiles()); l.addView(perm);
        Button start=new Button(this); start.setText("Iniciar servidor do hotspot"); start.setOnClickListener(v->startSrv()); l.addView(start);
        Button stop=new Button(this); stop.setText("Parar servidor"); stop.setOnClickListener(v->stopService(new Intent(this,HotspotServerService.class))); l.addView(stop);
        TextView help=new TextView(this); help.setPadding(0,24,0,0); help.setText("1. Ligue o hotspot do telefone.\n2. Conecte o PC ao hotspot.\n3. Inicie o servidor.\n4. Abra no PC o endereço mostrado na notificação/estado.\n\nNota: áreas privadas de outras apps continuam protegidas pelo Android."); l.addView(help);
        setContentView(l);
    }
    void requestAllFiles(){
        if(Build.VERSION.SDK_INT>=30 && !Environment.isExternalStorageManager()){
            Intent i=new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:"+getPackageName())); startActivity(i);
        }
    }
    void startSrv(){
        String u=user.getText().toString().trim(), p=pass.getText().toString();
        if(u.isEmpty()||p.length()<6){Toast.makeText(this,"Use utilizador e palavra-passe com pelo menos 6 caracteres",Toast.LENGTH_LONG).show(); return;}
        Intent i=new Intent(this,HotspotServerService.class); i.putExtra("user",u); i.putExtra("pass",p);
        if(Build.VERSION.SDK_INT>=26) startForegroundService(i); else startService(i);
        status.setText("A iniciar. Verifique a notificação para o endereço.");
    }
}
