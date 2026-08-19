package com.rs.localstorage;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public class UserStore {
    public static final int MAX_CLIENTS = 5;
    private static final String PREF = "rs_users";
    private final SharedPreferences p;

    public static class Client {
        public int slot;
        public String username;
        public boolean enabled;
        Client(int slot,String username,boolean enabled){this.slot=slot;this.username=username;this.enabled=enabled;}
    }

    public UserStore(Context c){ p=c.getSharedPreferences(PREF,Context.MODE_PRIVATE); }

    public boolean hasAdmin(){ return p.contains("admin_hash") && p.contains("admin_salt"); }
    public String adminUser(){ return p.getString("admin_user","admin"); }

    public void setAdmin(String user,String password){
        byte[] salt=randomSalt();
        p.edit().putString("admin_user",user.trim())
            .putString("admin_salt",b64(salt))
            .putString("admin_hash",b64(hash(password,salt))).apply();
    }

    public boolean verifyAdmin(String user,String password){
        if(!hasAdmin() || !adminUser().equals(user)) return false;
        try{
            byte[] salt=unb64(p.getString("admin_salt",""));
            byte[] expected=unb64(p.getString("admin_hash",""));
            return MessageDigest.isEqual(expected,hash(password,salt));
        }catch(Exception e){ return false; }
    }

    public List<Client> clients(){
        ArrayList<Client> out=new ArrayList<>();
        for(int i=0;i<MAX_CLIENTS;i++){
            String u=p.getString("c"+i+"_user","");
            if(!u.isEmpty()) out.add(new Client(i,u,p.getBoolean("c"+i+"_enabled",true)));
        }
        return out;
    }

    public int countClients(){ return clients().size(); }

    public int firstFreeSlot(){
        for(int i=0;i<MAX_CLIENTS;i++) if(p.getString("c"+i+"_user","").isEmpty()) return i;
        return -1;
    }

    public boolean usernameExists(String username,int exceptSlot){
        if(adminUser().equalsIgnoreCase(username)) return true;
        for(Client c:clients()) if(c.slot!=exceptSlot && c.username.equalsIgnoreCase(username)) return true;
        return false;
    }

    public boolean saveClient(int slot,String username,String password,boolean enabled){
        if(slot<0||slot>=MAX_CLIENTS||username==null||username.trim().isEmpty()) return false;
        SharedPreferences.Editor e=p.edit().putString("c"+slot+"_user",username.trim()).putBoolean("c"+slot+"_enabled",enabled);
        if(password!=null&&!password.isEmpty()){
            byte[] salt=randomSalt();
            e.putString("c"+slot+"_salt",b64(salt)).putString("c"+slot+"_hash",b64(hash(password,salt)));
        } else if(!p.contains("c"+slot+"_hash")) return false;
        e.apply(); return true;
    }

    public void deleteClient(int slot){
        p.edit().remove("c"+slot+"_user").remove("c"+slot+"_salt").remove("c"+slot+"_hash").remove("c"+slot+"_enabled").apply();
    }

    public void setClientEnabled(int slot,boolean enabled){ p.edit().putBoolean("c"+slot+"_enabled",enabled).apply(); }

    public int verifyClient(String username,String password){
        for(Client c:clients()){
            if(!c.enabled || !c.username.equals(username)) continue;
            try{
                byte[] salt=unb64(p.getString("c"+c.slot+"_salt",""));
                byte[] expected=unb64(p.getString("c"+c.slot+"_hash",""));
                if(MessageDigest.isEqual(expected,hash(password,salt))) return c.slot;
            }catch(Exception ignored){}
        }
        return -1;
    }

    public String clientUser(int slot){ return p.getString("c"+slot+"_user",""); }

    private byte[] randomSalt(){ byte[] s=new byte[16];new SecureRandom().nextBytes(s);return s; }
    private String b64(byte[] b){ return Base64.encodeToString(b,Base64.NO_WRAP); }
    private byte[] unb64(String s){ return Base64.decode(s,Base64.NO_WRAP); }
    private byte[] hash(String password,byte[] salt){
        try{
            PBEKeySpec spec=new PBEKeySpec(password.toCharArray(),salt,120000,256);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        }catch(Exception e){ throw new RuntimeException(e); }
    }
}
