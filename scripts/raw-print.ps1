param(
  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [Parameter(Mandatory = $true)]
  [string]$Path
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDataType;
  }

  [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Ansi)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA pDocInfo);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

  public static void SendBytes(string printerName, byte[] bytes) {
    IntPtr printer;
    if (!OpenPrinter(printerName, out printer, IntPtr.Zero)) {
      throw new Exception("No se pudo abrir la impresora: " + printerName);
    }

    try {
      DOCINFOA docInfo = new DOCINFOA();
      docInfo.pDocName = "Pedido El Nono Coqui";
      docInfo.pDataType = "RAW";

      if (!StartDocPrinter(printer, 1, docInfo)) throw new Exception("No se pudo iniciar el documento RAW.");
      if (!StartPagePrinter(printer)) throw new Exception("No se pudo iniciar la pagina RAW.");

      int written;
      if (!WritePrinter(printer, bytes, bytes.Length, out written) || written != bytes.Length) {
        throw new Exception("No se pudieron enviar todos los bytes a la impresora.");
      }

      EndPagePrinter(printer);
      EndDocPrinter(printer);
    }
    finally {
      ClosePrinter(printer);
    }
  }
}
"@

$bytes = [System.IO.File]::ReadAllBytes($Path)
[RawPrinter]::SendBytes($PrinterName, $bytes)
