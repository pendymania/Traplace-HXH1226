import os

# Define all replacements based on your grep output
replacements = {
    # 1. Action Buttons & Alerts
    'app/static/js/actions.js': [
        ("'✓ 복사됨'", "'✓ Copied'"),
        ("'복사'", "'Copy'"),
        ("'Ctrl+C / Cmd+C로 복사해주세요'", "'Press Ctrl+C / Cmd+C to copy'")
    ],

    # 2. Logic & Dynamic Labels
    'app/static/js/i18n.js': [
        # Credits name
        ("방구석개발자", "Developer"),
        
        # Logic checking for default names
        ("new Set(['도시', 'City'])", "new Set(['Town', 'City'])"),
        
        # Dynamic naming logic (Fortress & Sanctuary)
        ("`성채 ${roman}`", "`Fortress ${roman}`"),
        ("`유적 ${roman}`", "`Sanctuary ${roman}`")
    ],

    # 3. The Default Map Layout (The big list)
    'app/static/js/main.js': [
        # Fortress (Castle)
        ("'성채 I'", "'Fortress I'"),
        ("'성채 II'", "'Fortress II'"),
        ("'성채 III'", "'Fortress III'"),
        ("'성채 IV'", "'Fortress IV'"),

        # Sanctuary (Ruins/Shrines - '유적')
        ("'유적 I'", "'Sanctuary I'"),
        ("'유적 II'", "'Sanctuary II'"),
        ("'유적 III'", "'Sanctuary III'"),
        ("'유적 IV'", "'Sanctuary IV'"),
        ("'유적 V'", "'Sanctuary V'"),
        ("'유적 VI'", "'Sanctuary VI'"),
        ("'유적 VII'", "'Sanctuary VII'"),
        ("'유적 VIII'", "'Sanctuary VIII'"),
        ("'유적 IX'", "'Sanctuary IX'"),
        ("'유적 X'", "'Sanctuary X'"),
        ("'유적 XI'", "'Sanctuary XI'"),
        ("'유적 XII'", "'Sanctuary XII'")
    ],

    # 4. URL State Logic (Prevents 'Town' from being saved to URL if default)
    'app/static/js/urlState.js': [
        ("label !== '도시'", "label !== 'Town'")
    ]
}

def fix_files():
    base_dir = os.getcwd()
    print(f"🔧 Starting Final English Translation in: {base_dir}")

    for relative_path, changes in replacements.items():
        # Handle Windows paths correctly
        file_path = os.path.join(base_dir, *relative_path.split('/'))
        
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            count = 0
            for old_text, new_text in changes:
                # Replace all occurrences
                if old_text in new_content:
                    occurrences = new_content.count(old_text)
                    new_content = new_content.replace(old_text, new_text)
                    count += occurrences
            
            if count > 0:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✅ Fixed {count} items in {relative_path}")
            else:
                print(f"⚠️  No matches in {relative_path} (Already fixed?)")

        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")

if __name__ == "__main__":
    fix_files()