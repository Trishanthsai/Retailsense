import React, { useState } from "react";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Database, 
  Download, 
  Sparkles,
  Info
} from "lucide-react";
import { uploadSalesCsv, seedDemoData } from "../services/api";
import { DataImportResponse } from "../types";

interface DataManagementTabProps {
  onDataModified: () => void;
}

export const DataManagementTab: React.FC<DataManagementTabProps> = ({ onDataModified }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<DataImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
      setErrorMessage("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage("");
    try {
      const res = await uploadSalesCsv(selectedFile);
      setImportResult(res);
      onDataModified();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to upload CSV file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    setSeedSuccessMsg("");
    setErrorMessage("");
    try {
      const res = await seedDemoData(365);
      setSeedSuccessMsg(res.message || "Sample retail transactions seeded successfully.");
      onDataModified();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to seed demo data.");
    } finally {
      setIsSeeding(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = 
      "sale_date,product_id,product_name,category,store_id,quantity_sold,unit_price,is_promotion\n" +
      "2026-01-01,PRD-HEADPHONES,AcousticPro Headphones,Electronics,STR-01,12,149.99,0\n" +
      "2026-01-02,PRD-HEADPHONES,AcousticPro Headphones,Electronics,STR-01,15,149.99,0\n" +
      "2026-01-03,PRD-COFFEE,Artisan Colombian Coffee,Grocery,STR-01,24,24.50,1\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "retail_sales_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-indigo-400" />
          Data Ingestion & Dataset Management
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Import historical transaction logs or generate synthetic multi-product retail benchmark data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Ingestion Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Import Sales Transactions (CSV)</h4>
            <p className="text-xs text-slate-400 mb-4">
              File must contain columns: <code className="text-indigo-400">sale_date, product_id, quantity_sold, unit_price</code>.
            </p>

            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-950/40">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
                <FileText className="w-8 h-8 text-indigo-400 mb-2" />
                <span className="text-xs font-semibold text-white">
                  {selectedFile ? selectedFile.name : "Choose CSV File or Drag Here"}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Supported format: .csv (Max 50MB)
                </span>
              </label>
            </div>

            {errorMessage && (
              <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {importResult && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{importResult.message}</span>
                </div>
                <div className="text-[11px] text-emerald-200/80">
                  Total rows: {importResult.total_rows} | Imported: {importResult.imported_rows} | Skipped: {importResult.skipped_rows}
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="text-[10px] text-amber-300 mt-1">
                    Warnings: {importResult.errors.join(", ")}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={downloadSampleTemplate}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validating & Parsing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload & Ingest</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Database One-Click Seeder Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Populate Synthetic Retail Sandbox</h4>
            <p className="text-xs text-slate-400 mb-4">
              Instantly generate an 18-month retail dataset with 8 SKUs across 4 merchandise categories.
            </p>

            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-2 text-xs text-slate-300">
              <div className="font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Included Sandbox Properties:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>Weekly demand seasonality (Friday-Sunday traffic boosts)</li>
                <li>8% stochastic promotion campaigns with discount elasticity</li>
                <li>Supplier lead times (4 to 14 days) and safety stock variance</li>
                <li>Four inventory risk states: Critical Stockout, Reorder Needed, Balanced, Overstock</li>
              </ul>
            </div>

            {seedSuccessMsg && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{seedSuccessMsg}</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSeeding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Records...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5" />
                  <span>Generate 1-Year Retail Sandbox</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CSV Schema Specification */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          Supported CSV Data Contract Specification
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 uppercase bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Column</th>
                <th className="py-2.5 px-3">Required</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2 px-3 font-mono text-indigo-400">sale_date</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">Yes</td>
                <td className="py-2 px-3 text-slate-400">YYYY-MM-DD</td>
                <td className="py-2 px-3">Calendar transaction date</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-indigo-400">product_id</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">Yes</td>
                <td className="py-2 px-3 text-slate-400">String</td>
                <td className="py-2 px-3">Unique item identifier (e.g. PRD-HEADPHONES)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-indigo-400">quantity_sold</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">Yes</td>
                <td className="py-2 px-3 text-slate-400">Float / Integer</td>
                <td className="py-2 px-3">Units purchased (non-negative)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-indigo-400">unit_price</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">Yes</td>
                <td className="py-2 px-3 text-slate-400">Float</td>
                <td className="py-2 px-3">Selling price per unit</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-indigo-400">product_name</td>
                <td className="py-2 px-3 text-slate-500">Optional</td>
                <td className="py-2 px-3 text-slate-400">String</td>
                <td className="py-2 px-3">Display merchandise name</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-indigo-400">category</td>
                <td className="py-2 px-3 text-slate-500">Optional</td>
                <td className="py-2 px-3 text-slate-400">String</td>
                <td className="py-2 px-3">Product merchandise category</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-mono text-indigo-400">is_promotion</td>
                <td className="py-2 px-3 text-slate-500">Optional</td>
                <td className="py-2 px-3 text-slate-400">Boolean (0/1)</td>
                <td className="py-2 px-3">Indicator whether transaction was part of promotion</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
