from pathlib import Path

path = Path("rs-music/app/src/main/kotlin/com/mhglobal/rsmusic/MotionExperience.kt")
text = path.read_text()
annotation = "@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)\n"
if not text.startswith(annotation):
    path.write_text(annotation + text)
print("Material3 opt-in applied")
