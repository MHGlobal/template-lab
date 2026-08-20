package com.rs.localstorage;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.widget.PopupMenu;
import android.widget.ScrollView;
import android.widget.Toast;

/** Native navigation menu for the Android control app.
 * Kept as normal source in the build branch so navigation cannot exist only as a CI patch.
 */
final class MainNavigation {
    private MainNavigation() {}

    static void show(
            Activity activity,
            View anchor,
            ScrollView scroll,
            View server,
            View admin,
            View library,
            View ai,
            View clients) {
        PopupMenu menu = new PopupMenu(activity, anchor);
        menu.getMenu().add(0, 1, 0, "Início");
        menu.getMenu().add(0, 2, 1, "Servidor");
        menu.getMenu().add(0, 3, 2, "Administrador");
        menu.getMenu().add(0, 4, 3, "File Storage · Web");
        menu.getMenu().add(0, 5, 4, "RS Cinema · Web");
        menu.getMenu().add(0, 6, 5, "Biblioteca RS Media");
        menu.getMenu().add(0, 7, 6, "RS AI");
        menu.getMenu().add(0, 8, 7, "Clientes");
        menu.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case 1: scrollTo(scroll, null); return true;
                case 2: scrollTo(scroll, server); return true;
                case 3: scrollTo(scroll, admin); return true;
                case 4: openLocal(activity, "/admin/files"); return true;
                case 5: openLocal(activity, "/cinema"); return true;
                case 6: scrollTo(scroll, library); return true;
                case 7: scrollTo(scroll, ai); return true;
                case 8: scrollTo(scroll, clients); return true;
                default: return false;
            }
        });
        menu.show();
    }

    private static void scrollTo(ScrollView scroll, View target) {
        if (scroll == null) return;
        scroll.post(() -> scroll.smoothScrollTo(0, target == null ? 0 : Math.max(0, target.getTop() - 12)));
    }

    private static void openLocal(Activity activity, String path) {
        String status = activity.getSharedPreferences("rs", Activity.MODE_PRIVATE)
                .getString("status", "Servidor parado");
        if (status.toLowerCase().contains("parado")) {
            Toast.makeText(activity, "Inicie o servidor antes de abrir esta área web.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("http://127.0.0.1:8080" + path)));
        } catch (Exception e) {
            Toast.makeText(activity, e.getMessage() == null ? "Não foi possível abrir a área." : e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
}
