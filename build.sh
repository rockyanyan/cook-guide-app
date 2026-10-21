#!/bin/bash
set -e
SRC_ORIG="C:/Desktop/菜单/CookApp/app/src/main"
WORK="C:/Users/rockz/AppData/Local/Temp/cookbuild"
SRC="$WORK/src"
OUT="$WORK/build"
SDK="C:/cooktool/sdk"
BT="$SDK/build-tools/34.0.0"
JAR="$SDK/platforms/android-34/android.jar"
JAVA_HOME_DIR="C:/cooktool/jdk17"
JAVAC="$JAVA_HOME_DIR/bin/javac.exe"
KEYTOOL="$JAVA_HOME_DIR/bin/keytool.exe"
export JAVA_HOME="C:\\cooktool\\jdk17"
export PATH="$JAVA_HOME_DIR/bin:$PATH"

rm -rf "$SRC" "$OUT"
mkdir -p "$SRC" "$OUT/gen" "$OUT/classes" "$OUT/dex"
cp -r "$SRC_ORIG"/. "$SRC"/

echo "==> 1/6 编译资源"
"$BT/aapt2.exe" compile --dir "$SRC/res" -o "$OUT/res.zip"

echo "==> 2/6 链接资源"
"$BT/aapt2.exe" link -o "$OUT/base.apk" -I "$JAR" \
  --manifest "$SRC/AndroidManifest.xml" -A "$SRC/assets" \
  -R "$OUT/res.zip" --java "$OUT/gen" --auto-add-overlay

echo "==> 3/6 编译 Java"
find "$OUT/gen" -name "*.java" > "$OUT/sources.txt"
find "$SRC/java" -name "*.java" >> "$OUT/sources.txt"
"$JAVAC" -source 8 -target 8 -nowarn -encoding UTF-8 \
  -bootclasspath "$JAR" -classpath "$JAR" \
  -d "$OUT/classes" @"$OUT/sources.txt"

echo "==> 4/6 生成 dex"
CLASSES=$(find "$OUT/classes" -name "*.class" | tr '\n' ' ')
cmd //c "set JAVA_HOME=C:\cooktool\jdk17&& set PATH=%JAVA_HOME%\bin;%PATH%&& $BT\d8.bat --lib $JAR --min-api 26 --release --output $OUT\dex $CLASSES"

echo "==> 5/6 打包"
python - "$OUT" <<'PY'
import sys, os, zipfile, shutil
out = sys.argv[1]
shutil.copy(os.path.join(out, 'base.apk'), os.path.join(out, 'unsigned.apk'))
with zipfile.ZipFile(os.path.join(out, 'unsigned.apk'), 'a', zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(out, 'dex', 'classes.dex'), 'classes.dex')
print('   dex 已写入')
PY

echo "==> 6/6 对齐 + 签名"
KS="$OUT/cook.keystore"
"$KEYTOOL" -genkeypair -noprompt -keystore "$KS" -alias cook \
  -storepass cook123456 -keypass cook123456 \
  -dname "CN=Cook Guide, O=Personal, C=CN" -keyalg RSA -keysize 2048 -validity 10950 2>/dev/null

"$BT/zipalign.exe" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
"$BT/apksigner.bat" sign --ks "$KS" --ks-pass pass:cook123456 --key-pass pass:cook123456 \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT/CookGuide.apk" "$OUT/aligned.apk"

cmd //c "set JAVA_HOME=C:\cooktool\jdk17&& set PATH=%JAVA_HOME%\bin;%PATH%&& $BT\apksigner.bat verify -v $OUT\CookGuide.apk" | head -10

ls -lh "$OUT/CookGuide.apk"
