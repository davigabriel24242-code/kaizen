import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, OperationType } from '../types';
import { handleFirestoreError } from '../lib/utils';
import { ArrowLeft, Clock, CheckCircle, FileText, Users, MapPin, Tag, Calendar, Edit3, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const KaizenDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kaizen, setKaizen] = useState<Kaizen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchKaizen = async () => {
      try {
        const docRef = doc(db, 'kaizens', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setKaizen(docSnap.data() as Kaizen);
        } else {
          console.error("No such document!");
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `kaizens/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchKaizen();
  }, [id]);

  const handleStatusChange = async (newStatus: Kaizen['status']) => {
    if (!kaizen) return;
    try {
      const kaizenRef = doc(db, 'kaizens', kaizen.id);
      await updateDoc(kaizenRef, {
        status: newStatus,
        updatedAt: Date.now()
      });
      setKaizen({ ...kaizen, status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `kaizens/${kaizen.id}`);
    }
  };

  const handleExportExcel = async () => {
    if (!kaizen) return;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Kaizen');

    // Define styles
    const borderAll: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF134F5C' } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: borderAll
    };

    const titleStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 16, color: { argb: 'FF134F5C' }, name: 'Arial' },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
    };

    const cellStyleCenter: Partial<ExcelJS.Style> = {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: borderAll
    };

    const cellStyleLeft: Partial<ExcelJS.Style> = {
      font: { size: 10, name: 'Arial' },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: borderAll
    };

    const getRiskStyle = (val: string | undefined): Partial<ExcelJS.Style> => {
      let bgColor = 'FFFFFFFF';
      let fontColor = 'FF000000';
      if (val === 'Baixo') { bgColor = 'FF92D050'; fontColor = 'FFFFFFFF'; }
      else if (val === 'Médio') { bgColor = 'FFFFFF00'; fontColor = 'FF000000'; }
      else if (val === 'Alto') { bgColor = 'FFFF0000'; fontColor = 'FFFFFFFF'; }
      return {
        font: { bold: true, color: { argb: fontColor }, size: 10, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: borderAll
      };
    };

    const getRiskLabelStyle = (val: string | undefined): Partial<ExcelJS.Style> => {
      let bgColor = 'FF134F5C';
      if (val === 'Baixo') bgColor = 'FF00B050';
      else if (val === 'Médio') bgColor = 'FFFFC000';
      else if (val === 'Alto') bgColor = 'FFC00000';
      return {
        font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: borderAll
      };
    };

    // Helper to set cell value and style
    const setCell = (r: number, c: number, v: any, s: Partial<ExcelJS.Style> = cellStyleCenter) => {
      const cell = ws.getCell(r, c);
      cell.value = v || '';
      Object.assign(cell, s);
    };

    const setMergedCell = (r1: number, c1: number, r2: number, c2: number, v: any, s: Partial<ExcelJS.Style> = cellStyleCenter) => {
      ws.mergeCells(r1, c1, r2, c2);
      const cell = ws.getCell(r1, c1);
      cell.value = v || '';
      
      // Apply style to all cells in the merged range to ensure borders are drawn correctly
      for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
          Object.assign(ws.getCell(r, c), s);
        }
      }
    };

    // Note: exceljs uses 1-based indexing for rows and columns
    // The previous code used 0-based indexing. I need to add 1 to all row and column indices.

    // Fetch logo and add to sheet
    const addImageToSheet = (base64Data: string, range: { tl: { col: number, row: number }, br: { col: number, row: number } }) => {
      try {
        const base64String = base64Data.split(',')[1];
        const extension = base64Data.substring(base64Data.indexOf('/') + 1, base64Data.indexOf(';')) as any;
        const imageId = workbook.addImage({
          base64: base64String,
          extension: extension,
        });
        ws.addImage(imageId, range);
      } catch (e) {
        console.error('Error adding image to excel', e);
      }
    };

    try {
      const response = await fetch('/logo.png');
      if (!response.ok) throw new Error('Logo not found');
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('Fetched file is not an image');
      }

      const blob = await response.blob();
      const base64Logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Merge cells for logo (Row 1-6, Col 1-3)
      setMergedCell(1, 1, 6, 3, '', cellStyleCenter);
      addImageToSheet(base64Logo, { tl: { col: 0.1, row: 0.1 }, br: { col: 2.9, row: 5.9 } });
    } catch (e) {
      console.warn('Logo not found or invalid, using text fallback');
      setMergedCell(1, 1, 6, 3, 'FOSPAR', {
        ...titleStyle,
        font: { bold: true, size: 24, color: { argb: 'FF134F5C' }, name: 'Arial' }
      });
    }

    // Row 1-6: Title (Col 4-14)
    setMergedCell(1, 4, 6, 14, kaizen.title || 'RELATÓRIO DE KAIZEN', {
      ...titleStyle,
      font: { bold: true, size: 20, color: { argb: 'FF134F5C' }, name: 'Arial' },
      border: borderAll
    });

    // Row 7: Headers (Left) (was 6)
    setCell(7, 1, 'Unidade:', headerStyle);
    setCell(7, 2, 'Área:', headerStyle);
    setCell(7, 3, 'Data Início:', headerStyle);
    setCell(7, 4, 'Data fim:', headerStyle);
    setCell(7, 5, 'Método', headerStyle);
    setMergedCell(7, 6, 7, 7, 'Classificação', headerStyle);

    // Row 8: Values (Left) (was 7)
    setCell(8, 1, kaizen.unit || 'FOSPAR', cellStyleCenter);
    setCell(8, 2, kaizen.area, cellStyleCenter);
    setCell(8, 3, kaizen.startDate, cellStyleCenter);
    setCell(8, 4, kaizen.endDate, cellStyleCenter);
    setCell(8, 5, kaizen.method, cellStyleCenter);
    setMergedCell(8, 6, 8, 7, kaizen.classification, cellStyleCenter);

    // Row 9: Headers (Left)
    setMergedCell(9, 1, 9, 4, 'Problema / Oportunidade de Melhoria', headerStyle);
    setMergedCell(9, 5, 9, 7, 'Contramedida(s) / Solução(ões) Implementada(s)', headerStyle);

    // Row 10-11: Values (Left)
    setMergedCell(10, 1, 11, 4, kaizen.problem, cellStyleLeft);
    setMergedCell(10, 5, 11, 7, kaizen.solution, cellStyleLeft);

    // Row 12: Headers (Left)
    setMergedCell(12, 1, 12, 4, 'Condição Anterior', headerStyle);
    setMergedCell(12, 5, 12, 7, 'Condição Atual', headerStyle);

    // Row 13-18: Images (Left)
    setMergedCell(13, 1, 18, 4, '', cellStyleCenter);
    setMergedCell(13, 5, 18, 7, '', cellStyleCenter);

    // Add images if they exist
    if (kaizen.beforeImage) {
      addImageToSheet(kaizen.beforeImage, { tl: { col: 0.1, row: 12.1 }, br: { col: 3.9, row: 17.9 } });
    } else {
      ws.getCell(13, 1).value = '[Inserir Foto Antes Aqui]';
    }

    if (kaizen.afterImage) {
      addImageToSheet(kaizen.afterImage, { tl: { col: 4.1, row: 12.1 }, br: { col: 6.9, row: 17.9 } });
    } else {
      ws.getCell(13, 5).value = '[Inserir Foto Depois Aqui]';
    }

    // Row 19: Headers (Left)
    setMergedCell(19, 1, 19, 2, 'Dimensão da melhoria', headerStyle);
    setMergedCell(19, 3, 19, 4, 'Resultado(s) Alcançado(s)', headerStyle);
    setMergedCell(19, 5, 19, 7, 'Detalhamento do(s) Resultado (s)', headerStyle);

    // Row 20-25: Dimensions (Left)
    const dims = kaizen.improvementDimensions || [];
    const isEHS = dims.includes('Segurança') || dims.includes('Meio Ambiente') || dims.includes('Saúde');
    
    setMergedCell(20, 1, 20, 2, `EHS \t\t\t ${isEHS ? 'X' : ''}`, cellStyleLeft);
    setMergedCell(21, 1, 21, 2, `Produtividade \t\t ${dims.includes('Produtividade') ? 'X' : ''}`, cellStyleLeft);
    setMergedCell(22, 1, 22, 2, `Qualidade \t\t ${dims.includes('Qualidade') ? 'X' : ''}`, cellStyleLeft);
    setMergedCell(23, 1, 23, 2, `Custo \t\t\t ${dims.includes('Custo') ? 'X' : ''}`, cellStyleLeft);
    setMergedCell(24, 1, 24, 2, `Clientes \t\t ${dims.includes('Clientes') ? 'X' : ''}`, cellStyleLeft);
    setMergedCell(25, 1, 25, 2, `Equipe \t\t\t ${dims.includes('Moral') ? 'X' : ''}`, cellStyleLeft);

    setMergedCell(20, 3, 25, 4, kaizen.achievedResults, cellStyleCenter);
    setMergedCell(20, 5, 25, 7, kaizen.resultsDetails, cellStyleLeft);

    // --- RIGHT SIDE ---
    // Col 9-14
    setMergedCell(7, 9, 7, 14, 'Colaborador(es) / Equipe de Implantação da Melhoria (Foto/Nome)', headerStyle);
    setMergedCell(8, 9, 8, 14, kaizen.shiftLeader ? `Líder: ${kaizen.shiftLeader}` : 'Líder:', cellStyleCenter);
    
    const colabs = kaizen.collaborators || [];
    
    // Draw borders, names and photos for up to 6 collaborators
    for (let i = 0; i < 6; i++) {
      const rowOffset = Math.floor(i / 2) * 2; // 0, 0, 2, 2, 4, 4
      const colOffset = (i % 2) * 3; // 0, 3, 0, 3, 0, 3
      
      const photoRow = 9 + rowOffset;
      const nameRow = 10 + rowOffset;
      const startCol = 9 + colOffset;
      const endCol = 11 + colOffset;
      
      // Photo cell (merged)
      setMergedCell(photoRow, startCol, photoRow, endCol, '', cellStyleCenter);
      // Name cell (merged)
      setMergedCell(nameRow, startCol, nameRow, endCol, colabs[i]?.name || '', cellStyleCenter);
      
      if (colabs[i]?.photoURL) {
        addImageToSheet(colabs[i].photoURL, { 
          tl: { col: startCol - 1 + 0.1, row: photoRow - 1 + 0.1 }, 
          br: { col: endCol - 1 + 0.9, row: photoRow - 1 + 0.9 } 
        });
      }
    }

    setMergedCell(15, 9, 15, 14, 'Matriz de Risco', headerStyle);
    setMergedCell(16, 9, 16, 11, 'ANTES', headerStyle);
    setMergedCell(16, 12, 16, 14, 'DEPOIS', headerStyle);

    const rBefore = kaizen.riskMatrixBefore || {};
    const rAfter = kaizen.riskMatrixAfter || {};

    setMergedCell(17, 9, 17, 10, 'Segurança', getRiskLabelStyle(rBefore.safety));
    setCell(17, 11, rBefore.safety || '-', getRiskStyle(rBefore.safety));
    setMergedCell(17, 12, 17, 13, 'Segurança', getRiskLabelStyle(rAfter.safety));
    setCell(17, 14, rAfter.safety || '-', getRiskStyle(rAfter.safety));

    setMergedCell(18, 9, 18, 10, 'Saúde/HO', getRiskLabelStyle(rBefore.health));
    setCell(18, 11, rBefore.health || '-', getRiskStyle(rBefore.health));
    setMergedCell(18, 12, 18, 13, 'Saúde/HO', getRiskLabelStyle(rAfter.health));
    setCell(18, 14, rAfter.health || '-', getRiskStyle(rAfter.health));

    setMergedCell(19, 9, 19, 10, 'Meio Ambiente', getRiskLabelStyle(rBefore.environment));
    setCell(19, 11, rBefore.environment || '-', getRiskStyle(rBefore.environment));
    setMergedCell(19, 12, 19, 13, 'Meio Ambiente', getRiskLabelStyle(rAfter.environment));
    setCell(19, 14, rAfter.environment || '-', getRiskStyle(rAfter.environment));

    setMergedCell(20, 9, 20, 14, 'PLANO DE AÇÃO', headerStyle);
    setMergedCell(21, 9, 21, 14, 'MOC', headerStyle);
    setMergedCell(22, 9, 22, 11, `MOC Nº: ${kaizen.mocNumber || ''}`, cellStyleLeft);
    setMergedCell(22, 12, 22, 14, `TIPO DE MOC: ${kaizen.mocType || ''}`, cellStyleLeft);

    // Set column widths
    ws.columns = [
      { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 5 },
      { width: 2 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }
    ];

    // Set row heights
    ws.getRow(9).height = 60;
    ws.getRow(10).height = 20;
    ws.getRow(11).height = 60;
    ws.getRow(12).height = 20;
    ws.getRow(13).height = 60;
    ws.getRow(14).height = 20;
    ws.getRow(15).height = 40;
    ws.getRow(16).height = 40;
    ws.getRow(17).height = 40;
    ws.getRow(18).height = 40;
    ws.getRow(19).height = 40;
    ws.getRow(20).height = 20;
    ws.getRow(21).height = 20;
    ws.getRow(22).height = 20;
    ws.getRow(23).height = 20;
    ws.getRow(24).height = 20;
    ws.getRow(25).height = 20;

    // Generate and save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Kaizen_${kaizen.id.slice(0,8).toUpperCase()}.xlsx`);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando detalhes...</div>;
  if (!kaizen) return <div className="p-8 text-center text-red-500">Kaizen não encontrado.</div>;

  const timeline = [
    { status: 'draft', label: 'Rascunho', icon: FileText },
    { status: 'submitted', label: 'Enviado', icon: Clock },
    { status: 'approved', label: 'Aprovado', icon: CheckCircle },
    { status: 'implemented', label: 'Implementado', icon: CheckCircle },
    { status: 'verified', label: 'Verificado', icon: CheckCircle },
  ];

  const currentStatusIndex = timeline.findIndex(t => t.status === kaizen.status);
  const isRejected = kaizen.status === 'rejected';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors shadow-sm">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{kaizen.title}</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {kaizen.id.slice(0, 8).toUpperCase()} • Criado em {format(new Date(kaizen.createdAt), 'dd/MM/yyyy')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold capitalize shadow-sm border
            ${kaizen.status === 'draft' ? 'bg-gray-50 text-gray-700 border-gray-200' : 
              kaizen.status === 'submitted' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 
              kaizen.status === 'approved' ? 'bg-blue-50 text-blue-800 border-blue-200' : 
              kaizen.status === 'implemented' ? 'bg-purple-50 text-purple-800 border-purple-200' :
              isRejected ? 'bg-red-50 text-red-800 border-red-200' :
              'bg-green-50 text-green-800 border-green-200'}`}>
            {kaizen.status.replace('_', ' ')}
          </span>
        </div>
      </header>

      {/* Timeline */}
      {!isRejected && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px] relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 -z-10 rounded-full transition-all duration-500" 
                 style={{ width: `${Math.max(0, (currentStatusIndex / (timeline.length - 1)) * 100)}%` }}></div>
            
            {timeline.map((step, index) => {
              const Icon = step.icon;
              const isPast = currentStatusIndex >= index;
              const isCurrent = currentStatusIndex === index;
              
              return (
                <div key={step.status} className="flex flex-col items-center gap-3 bg-white px-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300
                    ${isPast ? 'bg-blue-500 border-blue-100 text-white shadow-md' : 'bg-white border-gray-100 text-gray-300'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-blue-600' : isPast ? 'text-gray-800' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Problem & Solution */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Descrição do Projeto
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Problema / Oportunidade</h3>
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 text-gray-800 leading-relaxed">
                  {kaizen.problem}
                </div>
                {kaizen.beforeImage && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Condição Anterior</h4>
                    <img src={kaizen.beforeImage} alt="Condição Anterior" className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200" />
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contramedida / Solução</h3>
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 text-gray-800 leading-relaxed">
                  {kaizen.solution || <span className="text-gray-400 italic">Nenhuma solução descrita ainda.</span>}
                </div>
                {kaizen.afterImage && (
                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Condição Atual</h4>
                    <img src={kaizen.afterImage} alt="Condição Atual" className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Resultados & Riscos */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Resultados & Riscos
            </h2>
            
            <div className="space-y-6">
              {kaizen.improvementDimensions && kaizen.improvementDimensions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dimensões de Melhoria</h3>
                  <div className="flex flex-wrap gap-2">
                    {kaizen.improvementDimensions.map(dim => (
                      <span key={dim} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">
                        {dim}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(kaizen.achievedResults || kaizen.resultsDetails) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {kaizen.achievedResults && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resultados Alcançados</h3>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-800 text-sm leading-relaxed">
                        {kaizen.achievedResults}
                      </div>
                    </div>
                  )}
                  {kaizen.resultsDetails && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Detalhamento</h3>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-800 text-sm leading-relaxed">
                        {kaizen.resultsDetails}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Matriz de Risco (Antes)</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Segurança:</span> <span className="font-medium">{kaizen.riskMatrixBefore?.safety || '-'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Saúde:</span> <span className="font-medium">{kaizen.riskMatrixBefore?.health || '-'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Meio Ambiente:</span> <span className="font-medium">{kaizen.riskMatrixBefore?.environment || '-'}</span></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Matriz de Risco (Depois)</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Segurança:</span> <span className="font-medium">{kaizen.riskMatrixAfter?.safety || '-'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Saúde:</span> <span className="font-medium">{kaizen.riskMatrixAfter?.health || '-'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Meio Ambiente:</span> <span className="font-medium">{kaizen.riskMatrixAfter?.environment || '-'}</span></div>
                  </div>
                </div>
              </div>

              {(kaizen.mocNumber || kaizen.mocType) && (
                <div className="pt-4 border-t border-gray-100 flex gap-6">
                  {kaizen.mocNumber && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">MOC Número</h3>
                      <p className="text-sm font-medium text-gray-900">{kaizen.mocNumber}</p>
                    </div>
                  )}
                  {kaizen.mocType && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">MOC Tipo</h3>
                      <p className="text-sm font-medium text-gray-900">{kaizen.mocType}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons based on Role & Status */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-3">
            {user?.uid === kaizen.createdBy && kaizen.status === 'draft' && (
              <button onClick={() => handleStatusChange('submitted')} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                Enviar para Aprovação
              </button>
            )}
            
            {(user?.role === 'leader' || user?.role === 'admin') && kaizen.status === 'submitted' && (
              <>
                <button onClick={() => handleStatusChange('approved')} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm">
                  Aprovar Kaizen
                </button>
                <button onClick={() => handleStatusChange('rejected')} className="px-6 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-50 transition-colors">
                  Reprovar
                </button>
              </>
            )}

            {(user?.role === 'leader' || user?.role === 'admin') && kaizen.status === 'approved' && (
              <button onClick={() => handleStatusChange('implemented')} className="px-6 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm">
                Marcar como Implementado
              </button>
            )}

            {(user?.role === 'leader' || user?.role === 'admin') && kaizen.status === 'implemented' && (
              <button onClick={() => handleStatusChange('verified')} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm">
                Verificar e Fechar
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Meta Info */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Detalhes</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Unidade / Área</p>
                  <p className="text-sm font-semibold text-gray-900">{kaizen.unit || 'FOSPAR'} • {kaizen.area}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Tag className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Classificação</p>
                  <p className="text-sm font-semibold text-gray-900">{kaizen.classification}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500 font-medium">Início / Fim</p>
                  <p className="text-sm font-semibold text-gray-900">{kaizen.startDate} até {kaizen.endDate || '-'}</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Team */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Equipe
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Líder do Turno</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                    {kaizen.shiftLeader ? kaizen.shiftLeader.charAt(0).toUpperCase() : '?'}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{kaizen.shiftLeader || 'Não informado'}</p>
                </div>
              </div>
              
              {kaizen.collaborators && kaizen.collaborators.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Colaboradores</p>
                  <div className="flex flex-wrap gap-2">
                    {kaizen.collaborators.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 pr-3 pl-1.5 py-1.5 rounded-full text-xs font-medium">
                        {c.photoURL ? (
                          <img src={c.photoURL} alt={c.name} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {c.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
