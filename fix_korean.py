import os

# Define the replacements
replacements = {
    # File: app/static/js/main.js (The Default Map Layout)
    'app/static/js/main.js': [
        ("'포탑 IV'", "'Turret IV'"),
        ("'포탑 III'", "'Turret III'"),
        ("'포탑 II'", "'Turret II'"),
        ("'포탑 I'", "'Turret I'")
    ],
    # File: app/static/js/i18n.js (The Renaming Logic)
    'app/static/js/i18n.js': [
        ('`포탑 ${roman}`', '`Turret ${roman}`'),  # Logic for dynamic labels
        ('"포탑 IV"', '"Turret IV"')              # Comment/Example text
    ]
}

def fix_files():
    base_dir = os.getcwd()
    print(f"🔧 Starting fix in: {base_dir}")

    for relative_path, changes in replacements.items():
        file_path = os.path.join(base_dir, relative_path)
        
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            continue

        try:
            # Read the file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Apply replacements
            new_content = content
            count = 0
            for old_text, new_text in changes:
                if old_text in new_content:
                    new_content = new_content.replace(old_text, new_text)
                    count += 1
            
            if count > 0:
                # Write back only if changes were made
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"✅ Fixed {count} items in {relative_path}")
            else:
                print(f"⚠️  No Korean text found in {relative_path} (Already fixed?)")

        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")

if __name__ == "__main__":
    fix_files()