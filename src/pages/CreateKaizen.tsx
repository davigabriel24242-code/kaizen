import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Kaizen, KaizenStatus, OperationType, User } from '../types';
import { handleFirestoreError, compressImage } from '../lib/utils';
import { ChevronRight, ChevronLeft, Save, Send, PlusCircle, Image as ImageIcon, X } from 'lucide-react';

const steps = [
  { id: 1, title: 'Contexto' },
  { id: 2, title: 'Problema & Solução' },
  { id: 3, title: 'Participantes' },
  { id: 4, title: 'Resultados & Riscos' },
  { id: 5, title: 'Evidências' }
];

export const CreateKaizen: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<Kaizen>>({
    title: '',
    unit: 'FOSPAR',
    problem: '',
    solution: '',
    area: '',
    month: new Date().toISOString().slice(0, 7),
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    method: 'Projeto de Melhoria',
    classification: 'Produtividade / Desempenho',
    improvementDimensions: [],
    achievedResults: '',
    resultsDetails: '',
    riskMatrixBefore: { safety: 'Baixo', health: 'Baixo', environment: 'Baixo' },
    riskMatrixAfter: { safety: 'Baixo', health: 'Baixo', environment: 'Baixo' },
    mocNumber: '',
    mocType: '',
    status: 'draft',
    postedOnWorkplace: false,
    shiftLeader: '',
    collaborators: [],
    evidences: []
  });

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersData = querySnapshot.docs.map(doc => doc.data() as User);
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'beforeImage' | 'afterImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    try {
      const compressedImage = await compressImage(file, 800, 800, 0.6);
      
      // Check if the compressed image is still too large for Firestore (1MB limit, so ~700KB base64 limit to be safe)
      if (compressedImage.length > 700 * 1024) {
        alert('A imagem é muito complexa e ficou muito grande mesmo após compressão. Tente uma imagem mais simples ou menor.');
        return;
      }
      
      setFormData(prev => ({ ...prev, [field]: compressedImage }));
    } catch (error) {
      console.error("Error compressing image:", error);
      alert("Erro ao processar a imagem. Tente novamente.");
    }
  };

  const handleDimensionChange = (dimension: string) => {
    setFormData(prev => {
      const current = prev.improvementDimensions || [];
      if (current.includes(dimension)) {
        return { ...prev, improvementDimensions: current.filter(d => d !== dimension) };
      } else {
        return { ...prev, improvementDimensions: [...current, dimension] };
      }
    });
  };

  const handleRiskChange = (type: 'before' | 'after', field: 'safety' | 'health' | 'environment', value: string) => {
    setFormData(prev => {
      const key = type === 'before' ? 'riskMatrixBefore' : 'riskMatrixAfter';
      const currentRisk = prev[key] || { safety: 'Baixo', health: 'Baixo', environment: 'Baixo' };
      return {
        ...prev,
        [key]: { ...currentRisk, [field]: value }
      };
    });
  };

  const handleSave = async (status: KaizenStatus) => {
    if (!user) return;
    setLoading(true);
    try {
      const kaizenRef = doc(collection(db, 'kaizens'));
      const newKaizen: Kaizen = {
        ...formData,
        id: kaizenRef.id,
        status,
        createdBy: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Kaizen;

      // Clean undefined values before saving to Firestore
      const cleanKaizen = JSON.parse(JSON.stringify(newKaizen));

      await setDoc(kaizenRef, cleanKaizen);
      navigate('/my-kaizens');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'kaizens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Novo Kaizen</h1>
        <p className="text-gray-500 mt-1">Preencha as informações do seu projeto de melhoria.</p>
      </header>

      {/* Stepper */}
      <div className="mb-8 flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded-full"></div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-300" 
             style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
        
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center gap-2 bg-gray-50 px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors
              ${currentStep >= step.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
              {step.id}
            </div>
            <span className={`text-xs font-medium ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'}`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-6 min-h-[400px]">
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Contexto do Kaizen</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade *</label>
                <input required type="text" name="unit" value={formData.unit} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ex: FOSPAR" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área *</label>
                <select required name="area" value={formData.area} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                  <option value="" disabled>Selecione a área...</option>
                  <option value="ADM">ADM</option>
                  <option value="Almoxarifado">Almoxarifado</option>
                  <option value="EHS">EHS</option>
                  <option value="Fabrica">Fabrica</option>
                  <option value="Laboratorio">Laboratorio</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Terminal">Terminal</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
                <input required type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim *</label>
                <input required type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                <select name="method" value={formData.method} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                  <option value="Projeto de Melhoria">Projeto de Melhoria</option>
                  <option value="5S">5S</option>
                  <option value="PDCA">PDCA</option>
                  <option value="DMAIC">DMAIC</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classificação</label>
                <select name="classification" value={formData.classification} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                  <option value="Produtividade / Desempenho">Produtividade / Desempenho</option>
                  <option value="EHS (Segurança/Meio Ambiente)">EHS (Segurança/Meio Ambiente)</option>
                  <option value="Qualidade">Qualidade</option>
                  <option value="Custo">Custo</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Problema & Solução</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Kaizen *</label>
              <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Resumo curto da melhoria" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Problema / Oportunidade *</label>
              <textarea required name="problem" value={formData.problem} onChange={handleChange} rows={4} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" placeholder="Descreva a situação atual e o problema encontrado..." />
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto da Condição Anterior</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                    {formData.beforeImage ? (
                      <img src={formData.beforeImage} alt="Antes" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <span className="text-xs">Adicionar Foto</span>
                      </div>
                    )}
                    <input type="file" accept="image/jpeg, image/png" onChange={(e) => handleImageUpload(e, 'beforeImage')} className="hidden" />
                  </label>
                  {formData.beforeImage && (
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, beforeImage: undefined }))} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                      <X className="w-4 h-4" /> Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contramedida / Solução</label>
              <textarea name="solution" value={formData.solution} onChange={handleChange} rows={4} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" placeholder="O que foi feito para resolver o problema?" />
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto da Condição Atual</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden">
                    {formData.afterImage ? (
                      <img src={formData.afterImage} alt="Depois" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <ImageIcon className="w-6 h-6 mb-1" />
                        <span className="text-xs">Adicionar Foto</span>
                      </div>
                    )}
                    <input type="file" accept="image/jpeg, image/png" onChange={(e) => handleImageUpload(e, 'afterImage')} className="hidden" />
                  </label>
                  {formData.afterImage && (
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, afterImage: undefined }))} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                      <X className="w-4 h-4" /> Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Equipe e Participantes</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Líder do Turno</label>
              <input type="text" name="shiftLeader" value={formData.shiftLeader} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Nome do líder" />
            </div>
            
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Colaboradores Envolvidos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {users.map(u => {
                  const isSelected = formData.collaborators?.some(c => c.uid === u.uid);
                  return (
                    <label key={u.uid} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer border border-transparent hover:border-gray-200 transition-colors">
                      <input 
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              collaborators: [...(prev.collaborators || []), { name: u.name, shift: u.shift || '', photoURL: u.photoURL, uid: u.uid }]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              collaborators: (prev.collaborators || []).filter(c => c.uid !== u.uid)
                            }));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-gray-700">{u.name}</span>
                      </div>
                    </label>
                  );
                })}
                {users.length === 0 && (
                  <p className="text-sm text-gray-500 p-2">Nenhum usuário encontrado.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Resultados & Riscos</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dimensões de Melhoria</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['Segurança', 'Meio Ambiente', 'Qualidade', 'Produtividade', 'Custo', 'Moral'].map(dim => (
                  <label key={dim} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input 
                      type="checkbox" 
                      checked={formData.improvementDimensions?.includes(dim) || false}
                      onChange={() => handleDimensionChange(dim)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{dim}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resultados Alcançados (Resumo)</label>
              <textarea name="achievedResults" value={formData.achievedResults} onChange={handleChange} rows={3} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" placeholder="Resumo dos resultados obtidos..." />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Detalhamento dos Resultados</label>
              <textarea name="resultsDetails" value={formData.resultsDetails} onChange={handleChange} rows={3} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" placeholder="Detalhes quantitativos e qualitativos..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Matriz de Risco (Antes)</h3>
                <div className="space-y-3">
                  {(['safety', 'health', 'environment'] as const).map(field => (
                    <div key={`before-${field}`} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{field === 'safety' ? 'Segurança' : field === 'health' ? 'Saúde' : 'Meio Ambiente'}</span>
                      <select 
                        value={formData.riskMatrixBefore?.[field] || 'Baixo'} 
                        onChange={(e) => handleRiskChange('before', field, e.target.value)}
                        className="p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Baixo">Baixo</option>
                        <option value="Médio">Médio</option>
                        <option value="Alto">Alto</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Matriz de Risco (Depois)</h3>
                <div className="space-y-3">
                  {(['safety', 'health', 'environment'] as const).map(field => (
                    <div key={`after-${field}`} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{field === 'safety' ? 'Segurança' : field === 'health' ? 'Saúde' : 'Meio Ambiente'}</span>
                      <select 
                        value={formData.riskMatrixAfter?.[field] || 'Baixo'} 
                        onChange={(e) => handleRiskChange('after', field, e.target.value)}
                        className="p-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Baixo">Baixo</option>
                        <option value="Médio">Médio</option>
                        <option value="Alto">Alto</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número MOC (Se aplicável)</label>
                <input type="text" name="mocNumber" value={formData.mocNumber} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ex: MOC-2023-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo MOC</label>
                <input type="text" name="mocType" value={formData.mocType} onChange={handleChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ex: Alteração de Processo" />
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Evidências e Finalização</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <PlusCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-gray-700">Clique para anexar fotos (Antes/Depois)</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG ou PDF (Max 5MB)</p>
              <p className="text-xs text-red-500 mt-2 italic">*Upload de arquivos desabilitado no MVP. Use URLs se necessário.</p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <input type="checkbox" id="workplace" name="postedOnWorkplace" checked={formData.postedOnWorkplace} onChange={handleChange} className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" />
              <label htmlFor="workplace" className="text-sm font-medium text-blue-900">
                Este Kaizen já foi postado no Workplace?
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1 || loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSave('draft')}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Save className="w-5 h-5" />
            Salvar Rascunho
          </button>

          {currentStep < steps.length ? (
            <button 
              onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Próximo
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => handleSave('submitted')}
              disabled={loading || !formData.title || !formData.problem || !formData.area}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Send className="w-5 h-5" />
              Enviar para Aprovação
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
