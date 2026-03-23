
import os

file_path = "c:\\Users\\Admin\\Desktop\\Xiaozhi\\xiaozhi-local-chat\\main\\xiaozhi-server\\streamlit_app.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Locate the F-string start
f_string_start = 'st.markdown(f"""'
normal_string_start = 'st.markdown("""'

if f_string_start in content:
    print("Found f-string, refactoring...")
    
    # Replace the start
    content = content.replace(f_string_start, normal_string_start)
    
    # 2. Revert double braces {{ }} to single { }
    # This is safe because we are no longer in an f-string
    content = content.replace("{{", "{").replace("}}", "}")
    
    # 3. Replace the variable injection {bg_css} with a placeholder + .replace()
    # The current code has {bg_css} inside the string. 
    # Since we replaced {{ with {, {bg_css} remains {bg_css} (or if it was double-braced {{bg_css}}, it became {bg_css})
    # Wait, in the f-string it was {bg_css}. 
    # If I ran .replace("{{", "{"), then {bg_css} stays {bg_css} because it wasn't double escaped.
    # So now it is literally "{bg_css}" in the string.
    
    # We want to change:
    # st.markdown(""" ... {bg_css} ... """, unsafe_allow_html=True)
    # to:
    # st.markdown(""" ... __BG_CSS__ ... """.replace("__BG_CSS__", bg_css), unsafe_allow_html=True)
    
    if "{bg_css}" in content:
        content = content.replace("{bg_css}", "__BG_CSS__")
    
    # Find the end of the markdown call to append .replace(...)
    # The end is likely """, unsafe_allow_html=True)
    
    end_marker = '""", unsafe_allow_html=True)'
    new_end_marker = '""".replace("__BG_CSS__", bg_css), unsafe_allow_html=True)'
    
    content = content.replace(end_marker, new_end_marker)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    
    print("✅ Successfully refactored CSS to standard string with .replace()")
else:
    print("⚠️ F-string start not found. File might already be refactored or different format.")
