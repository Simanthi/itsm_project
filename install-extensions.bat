@echo off
setlocal enabledelayedexpansion REM Enables !variable! syntax for delayed expansion

set "EXTENSIONS_FILE=extensions.txt"

echo Installing VS Code extensions from %EXTENSIONS_FILE%...

if not exist "%EXTENSIONS_FILE%" (
    echo Error: %EXTENSIONS_FILE% not found!
    echo Please create a file named %EXTENSIONS_FILE% with one extension ID per line.
    exit /b 1
)

REM Loop through each line in the extensions file
for /f "tokens=*" %%a in ('type "%EXTENSIONS_FILE%"') do (
    set "extension_id=%%a"

    REM Trim leading/trailing whitespace (a common issue with extension IDs)
    for /f "tokens=*" %%b in ("!extension_id!") do set "trimmed_extension_id=%%b"

    REM Check if the trimmed line is empty
    if not defined trimmed_extension_id (
        echo Skipping empty line.
        REM Use 'continue' if you were in a modern shell, but in batch,
        REM we just let the block end and the loop continues naturally.
    ) else (
        REM Check for comment prefixes (case-insensitive for REM)
        set "first_two_chars=!trimmed_extension_id:~0,2!"
        set "first_char=!trimmed_extension_id:~0,1!"

        if /i "!first_two_chars!"=="RE" (
            REM Checks for REM or Rem
            echo Skipping comment: !trimmed_extension_id!
        ) else if "!first_two_chars!"=="::" (
            echo Skipping comment: !trimmed_extension_id!
        ) else if "!first_char!"=="@" (
            echo Skipping comment: !trimmed_extension_id!
        ) else (
            REM If it's not a comment or empty, install the extension
            echo Installing !trimmed_extension_id!...
            call code --install-extension "!trimmed_extension_id!" --force
        )
    )
)

echo VS Code extension installation complete!
pause
