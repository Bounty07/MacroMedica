import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { UploadCloud, CheckCircle2, ShieldCheck, Zap, Lock, MessageSquare, Loader2, X, FileText } from 'lucide-react'

export default function VerificationPage() {
  const navigate = useNavigate()
  const [verificationData, setVerificationData] = useState(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('pending_verification') || '{}')
    if (!data.userId) {
      navigate('/login')
    } else {
      setVerificationData(data)
    }
  }, [navigate])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setPreview(reader.result)
        reader.readAsDataURL(selectedFile)
      } else {
        setPreview(null)
      }
    }
  }

  const handleUpload = async () => {
    if (!file || !verificationData) return
    setUploading(true)
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const filePath = `${verificationData.userId}/${Math.random()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Insert into documents table
      const { error: docError } = await supabase.from('documents').insert([{
        cabinet_id: verificationData.cabinetId,
        patient_id: null,
        type_document: 'professionnel', // custom type for verification
        storage_path: uploadData.path,
        nom_fichier: file.name
      }])

      if (docError) throw docError

      setSuccess(true)
      toast.success('Document envoyé avec succès !')
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Erreur lors de l\'envoi du document.')
    } finally {
      setUploading(false)
    }
  }

  if (!verificationData) return null

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-outfit">
      {/* Navbar Simple */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">M</div>
          <span className="text-xl font-bold tracking-tight text-slate-900">MacroMedica</span>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
          <span className="text-teal-600">Vérification</span>
          <a href="#" className="hover:text-teal-600">Aide</a>
          <a href="#" className="hover:text-teal-600">Support</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 max-w-[900px] mx-auto w-full py-12 px-6">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Confirmez votre statut professionnel</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Pour garantir la sécurité de la communauté médicale MacroMedica, nous vérifions chaque inscription. 
            Cela prend moins de 30 secondes.
          </p>
        </div>

        {success ? (
          <div className="bg-white rounded-[24px] border border-teal-100 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Document envoyé avec succès !</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto line-clamp-2">
              Notre équipe validera votre compte dans les 2 prochaines heures ouvrées. Vous pouvez déjà commencer à explorer votre tableau de bord.
            </p>
            <button 
              onClick={() => { window.location.href = '/dashboard' }}
              className="bg-teal-600 text-white rounded-xl px-8 py-4 font-bold hover:bg-teal-700 transition shadow-lg shadow-teal-600/20"
            >
              Accéder au tableau de bord →
            </button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Option 1: WhatsApp */}
              <div className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm flex flex-col h-full hover:border-teal-200 transition">
                <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                  <MessageSquare size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Contactez le support</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-8 flex-1">
                  Discutez instantanément avec notre équipe de validation via WhatsApp. Envoyez une photo de votre carte et accédez au réseau.
                </p>
                <a 
                  href={`https://wa.me/212600000000?text=Bonjour, je suis Dr. ${verificationData.nomComplet}, je souhaite vérifier mon compte MacroMedica. Email: ${verificationData.email}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-500 text-white text-center rounded-xl py-4 font-bold hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 block"
                >
                  💬 CONTACTER VIA WHATSAPP
                </a>
              </div>

              {/* Option 2: Upload */}
              <div className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm flex flex-col h-full hover:border-teal-200 transition">
                <div className="h-12 w-12 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600 mb-6">
                  <UploadCloud size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Importer un document</h3>
                
                <div className="flex-1">
                  {!file ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-teal-400 transition cursor-pointer relative group">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                      <UploadCloud size={32} className="mx-auto text-slate-300 group-hover:text-teal-500 transition mb-3" />
                      <p className="text-sm font-bold text-slate-700">Glissez-déposez ici</p>
                      <p className="text-xs text-slate-400 mt-1">Carte Professionnelle ou Diplôme (JPG, PNG, PDF)</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-2xl p-4 relative border border-teal-100">
                      <button onClick={() => {setFile(null); setPreview(null)}} className="absolute -top-2 -right-2 h-6 w-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm z-10">
                        <X size={14} />
                      </button>
                      <div className="flex items-center gap-3">
                        {preview ? (
                          <img src={preview} alt="file preview" className="h-16 w-16 object-cover rounded-lg border border-white shadow-sm" />
                        ) : (
                          <div className="h-16 w-16 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-teal-500">
                            <FileText size={24} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <p className="text-[11px] text-slate-400 mb-4 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-teal-500" /> Validation manuelle sous 2 heures ouvrées.
                  </p>
                  <button 
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full bg-teal-600 text-white rounded-xl py-4 font-bold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
                  >
                    {uploading ? <><Loader2 className="animate-spin" size={18} /> ENVOI EN COURS...</> : 'ENVOYER POUR VÉRIFICATION'}
                  </button>
                </div>
              </div>
            </div>

            {/* Skip Option */}
            <div className="text-center">
              <button 
                onClick={() => { window.location.href = '/dashboard' }}
                className="text-slate-400 hover:text-slate-600 text-sm font-medium underline underline-offset-4 decoration-slate-300"
              >
                Passer pour l'instant → Accéder au tableau de bord
              </button>
              <p className="text-[11px] text-slate-300 mt-2">Certaines fonctionnalités seront limitées jusqu'à la vérification</p>
            </div>
          </>
        )}

        {/* Trust Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-12 border-t border-slate-200">
          <div className="flex flex-col items-center text-center px-4">
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
              <ShieldCheck size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Protection des données</h4>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              L'accès aux dossiers est strictement réservé aux médecins vérifiés.
            </p>
          </div>
          <div className="flex flex-col items-center text-center px-4">
            <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4">
              <Zap size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Activation rapide</h4>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Votre cabinet est opérationnel immédiatement après validation.
            </p>
          </div>
          <div className="flex flex-col items-center text-center px-4">
            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
              <Lock size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Confidentialité garantie</h4>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Votre document est supprimé après la vérification effectuée.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-100 text-center">
        <p className="text-[12px] text-slate-400">© 2024 MacroMedica - Plateforme d'Excellence Médicale au Maroc</p>
      </footer>
    </div>
  )
}
