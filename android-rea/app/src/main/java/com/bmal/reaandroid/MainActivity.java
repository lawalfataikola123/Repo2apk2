package com.bmal.reaandroid;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private EditText argsInput;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(28, 36, 28, 24);
        root.setBackgroundColor(0xFF08111D);

        TextView title = new TextView(this);
        title.setText("REA Android");
        title.setTextSize(28);
        title.setTextColor(0xFFEAF2FF);
        title.setGravity(Gravity.CENTER);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView subtitle = new TextView(this);
        subtitle.setText("Android companion for the REA CLI");
        subtitle.setTextSize(14);
        subtitle.setTextColor(0xFF9DB2CC);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1, -2);
        sp.setMargins(0, 8, 0, 24);
        root.addView(subtitle, sp);

        TextView notice = new TextView(this);
        notice.setText("Requires Termux and REA installed in Termux. This app sends commands to your Termux session; it does not bundle the REA engine.");
        notice.setTextSize(13);
        notice.setTextColor(0xFFFFD28A);
        notice.setPadding(14, 14, 14, 14);
        notice.setBackgroundColor(0xFF192638);
        root.addView(notice, new LinearLayout.LayoutParams(-1, -2));

        addButton(root, "Install REA + setup", v -> runShell("npm install -g rea-agents && rea setup"));
        addButton(root, "REA doctor", v -> runRea("doctor"));
        addButton(root, "REA help", v -> runRea("--help"));
        addButton(root, "Start REA MCP", v -> runRea("mcp"));

        TextView label = new TextView(this);
        label.setText("Custom REA arguments (example: inspect --help)");
        label.setTextColor(0xFFEAF2FF);
        label.setTextSize(13);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(0, 18, 0, 8);
        root.addView(label, lp);

        argsInput = new EditText(this);
        argsInput.setSingleLine(true);
        argsInput.setHint("enter arguments");
        argsInput.setTextColor(0xFFEAF2FF);
        argsInput.setHintTextColor(0xFF7E91AA);
        argsInput.setPadding(12, 10, 12, 10);
        argsInput.setBackgroundColor(0xFF192638);
        root.addView(argsInput, new LinearLayout.LayoutParams(-1, -2));
        addButton(root, "Run REA command", v -> {
            String raw = argsInput.getText().toString().trim();
            if (raw.isEmpty()) { toast("Enter REA arguments first"); return; }
            ArrayList<String> args = new ArrayList<>();
            for (String part : raw.split("\\s+")) if (!part.isEmpty()) args.add(part);
            runTermux("rea", args);
        });

        TextView footer = new TextView(this);
        footer.setText("If Termux asks for permission, allow this app to run commands.");
        footer.setTextColor(0xFF9DB2CC);
        footer.setTextSize(12);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams fp = new LinearLayout.LayoutParams(-1, -2);
        fp.setMargins(0, 18, 0, 0);
        root.addView(footer, fp);
        setContentView(root);
    }

    private void addButton(LinearLayout root, String text, View.OnClickListener click) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setOnClickListener(click);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 8, 0, 0);
        root.addView(b, p);
    }

    private void runRea(String... args) {
        ArrayList<String> list = new ArrayList<>();
        for (String a : args) list.add(a);
        runTermux("rea", list);
    }

    private void runShell(String command) {
        ArrayList<String> args = new ArrayList<>();
        args.add("-lc");
        args.add(command);
        runTermux("bash", args);
    }

    private void runTermux(String executable, ArrayList<String> args) {
        try {
            Intent intent = new Intent("com.termux.RUN_COMMAND");
            intent.setComponent(new ComponentName("com.termux", "com.termux.app.RunCommandService"));
            intent.putExtra("com.termux.RUN_COMMAND_PATH", executable);
            intent.putStringArrayListExtra("com.termux.RUN_COMMAND_ARGUMENTS", args);
            intent.putExtra("com.termux.RUN_COMMAND_WORKDIR", "/data/data/com.termux/files/home");
            intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", false);
            intent.putExtra("com.termux.RUN_COMMAND_SESSION_ACTION", "0");
            startService(intent);
            toast("Command sent to Termux");
        } catch (Exception e) {
            toast("Open Termux first and enable Allow external apps to run commands.");
        }
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}
