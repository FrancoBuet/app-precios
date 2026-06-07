@echo off
cd /d "%~dp0"
echo Iniciando impresion automatica de pedidos...
echo Deja esta ventana abierta mientras quieras imprimir automaticamente.
npm run print:pedidos
pause
