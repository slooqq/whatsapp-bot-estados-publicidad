@echo off
cd /d C:\repos\whatsapp-bot-estados-publicidad

:: Crear carpetas de imagenes si no existen
set "BASE=D:\PUBLICIDAD AUTONOMA"
echo Verificando carpetas en %BASE%...
if not exist "%BASE%" mkdir "%BASE%"
for %%d in (
    "1 p -  domotica"
    "1 p -  electronica"
    "1 p -  solar"
    "1 p - pos pc"
    "1 p - UNI T"
    "1 p"
    "2 p - domotica"
    "2 p - electronica"
    "2 p - solar"
    "2 p - pos pc"
    "2 p - u t"
    "2 p"
) do (
    if not exist "%BASE%\%%~d" (
        mkdir "%BASE%\%%~d"
        echo   Creada: %BASE%\%%~d
    )
)

if exist "build\bot-publicidad.exe" (
    echo Iniciando bot desde ejecutable...
    build\bot-publicidad.exe
) else (
    echo Ejecutable no encontrado, iniciando con npm...
    npm start
)
pause
