@echo off
set "EXTENSIONS_FILE=extensions.txt"

echo Installing VS Code extensions from %EXTENSIONS_FILE%...

if not exist "%EXTENSIONS_FILE%" (
    echo Error: %EXTENSIONS_FILE% not found!
    echo Please create a file named %EXTENSIONS_FILE% with one extension ID per line.
    exit /b 1
)

for /f "tokens=*" %%a in (%EXTENSIONS_FILE%) do (
    set "extension_id=%%a"
    REM Skip empty lines and comments (lines starting with REM or :: or @)
    echo !extension_id! | findstr /r /c:"^$" >nul && goto :skip_line
    echo !extension_id! | findstr /r /c:"^[Rr][Ee][Mm]" >nul && goto :skip_line
    echo !extension_id! | findstr /r /c:"^::" >nul && goto :skip_line
    echo !extension_id! | findstr /r /c:"^@" >nul && goto :skip_line

    echo Installing !extension_id!...
    call code --install-extension !extension_id! --force
    :skip_line
)

echo VS Code extension installation complete!
pause