package com.rs.localstorage;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.PopupMenu;
import android.widget.ScrollView;
import android.widget.Toast;

/**
 * Native navigation menu for the Android control app.
 * Kept as normal source in the build branch so navigation cannot exist only as a CI patch.
 */
final class MainNavigation {
    private static final int GROUP_NATIVE = 10;
    private static final int GROUP_WEB = 20;
    private static final int ID_HOME = 1;
    private static final int ID_SERVER = 2;
    private static final int ID_ADMIN = 3;
    private static final int ID_LIBRARY = 4;
    private static final int ID_AI = 5;
    private static final int ID_CLIENTS = 6;
    private static final int ID_FILES = 7;
    private static final int ID_CINEMA = 8;

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
        if (activity == null || anchor == null) return;

        anchor.setContentDescription("Abrir menu de navegação");
        PopupMenu popup = new PopupMenu(activity, anchor, Gravity.START);
        Menu menu = popup.getMenu();

        menu.add(GROUP_NATIVE, ID_HOME, 0, "Início");
        menu.add(GROUP_NATIVE, ID_SERVER, 1, "Servidor");
        menu.add(GROUP_NATIVE, ID_ADMIN, 2, "Administrador");
        menu.add(GROUP_NATIVE, ID_LIBRARY, 3, "Biblioteca RS Media");
        menu.add(GROUP_NATIVE, ID_AI, 4, "RS AI");
        menu.add(GROUP_NATIVE, ID_CLIENTS, 5, "Clientes");
        menu.add(GROUP_WEB, ID_FILES, 6, "File Storage · Web");
        menu.add(GROUP_WEB, ID_CINEMA, 7, "RS Cinema · Web");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            menu.setGroupDividerEnabled(true);
        }

        final boolean serverRunning = isServerRunning(activity);
        MenuItem files = menu.findItem(ID_FILES);
        MenuItem cinema = menu.findItem(ID_CINEMA);
        if (!serverRunning) {
            files.setTitle("File Storage · Web — servidor parado");
            cinema.setTitle("RS Cinema · Web — servidor parado");
        }

        popup.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case ID_HOME:
                    scrollTo(scroll, null, anchor, "Início");
                    return true;
                case ID_SERVER:
                    scrollTo(scroll, server, anchor, "Servidor");
                    return true;
                case ID_ADMIN:
                    scrollTo(scroll, admin, anchor, "Administrador");
                    return true;
                case ID_LIBRARY:
                    scrollTo(scroll, library, anchor, "Biblioteca RS Media");
                    return true;
                case ID_AI:
                    scrollTo(scroll, ai, anchor, "RS AI");
                    return true;
                case ID_CLIENTS:
                    scrollTo(scroll, clients, anchor, "Clientes");
                    return true;
                case ID_FILES:
                    openLocal(activity, "/admin/files");
                    return true;
                case ID_CINEMA:
                    openLocal(activity, "/cinema");
                    return true;
                default:
                    return false;
            }
        });
        popup.show();
    }

    private static void scrollTo(ScrollView scroll, View target, View announcer, String label) {
        if (scroll == null) return;
        scroll.post(() -> {
            int y = target == null ? 0 : Math.max(0, target.getTop() - 12);
            scroll.smoothScrollTo(0, y);
            if (announcer != null) announcer.announceForAccessibility(label);
        });
    }

    private static boolean isServerRunning(Activity activity) {
        String status = activity.getSharedPreferences("rs", Activity.MODE_PRIVATE)
                .getString("status", "Servidor parado");
        return status != null && !status.toLowerCase().contains("parado");
    }

    private static void openLocal(Activity activity, String path) {
        if (!isServerRunning(activity)) {
            Toast.makeText(activity, "Inicie o servidor antes de abrir esta área web.", Toast.LENGTH_LONG).show();
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("http://127.0.0.1:8080" + path));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_DOCUMENT);
            activity.startActivity(intent);
        } catch (Exception e) {
            String message = e.getMessage();
            Toast.makeText(activity, message == null || message.trim().isEmpty() ? "Não foi possível abrir a área." : message, Toast.LENGTH_LONG).show();
        }
    }
}
