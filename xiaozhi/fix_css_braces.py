
import os

file_path = "c:\\Users\\Admin\\Desktop\\Xiaozhi\\xiaozhi-local-chat\\main\\xiaozhi-server\\streamlit_app.py"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
in_css_block = False
css_start_marker = "/* ========== PAGE TITLE ========== */"
css_end_marker = "</style>"  # End of style block

for line in lines:
    if css_start_marker in line:
        in_css_block = True
    
    if in_css_block:
        # Escape braces
        # Note: We must be careful not to double escape if already escaped (though unlikely in this specific range based on my inspection)
        # But simple replace is fine because the original file didn't use f-string here.
        
        # Check if line ends the block
        if css_end_marker in line:
            in_css_block = False
            new_lines.append(line) # Don't escape the closing tag line if it has no braces
            continue
            
        escaped_line = line.replace("{", "{{").replace("}", "}}")
        new_lines.append(escaped_line)
    else:
        new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("✅ Successfully escaped braces in CSS block.")
