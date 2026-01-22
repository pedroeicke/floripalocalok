import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getListingById, incrementListingView, incrementListingClick } from "@/services/listings";
import { createConversation, sendMessage } from "@/services/messages";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import {
    Heart,
    Phone,
    Mail,
    MessageCircle,
    Flag,
    Camera,
    ChevronRight,
    CheckCircle2,
    Check,
    X
} from "lucide-react";

export default function AdDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeImage, setActiveImage] = useState(0);
    const [showStickyBar, setShowStickyBar] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    
    // Email Modal State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailStep, setEmailStep] = useState(1);
    const [visitorEmail, setVisitorEmail] = useState("");
    const [robotChecked, setRobotChecked] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUser(data.user);
        });
    }, []);

    const { data: ad, isLoading, error } = useQuery({
        queryKey: ['ad', id],
        queryFn: () => getListingById(id || ""),
        enabled: !!id
    });

    useEffect(() => {
        if (id) {
            // Increment view count on load (once per mount)
            incrementListingView(id);
        }
    }, [id]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowStickyBar(true);
            } else {
                setShowStickyBar(false);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleContact = async () => {
        if (!currentUser) {
            toast.error("Faça login para contatar o vendedor");
            navigate("/login");
            return;
        }

        if (!ad || !messageText.trim()) {
            toast.error("Escreva uma mensagem");
            return;
        }

        setIsSending(true);
        try {
            // 1. Create or Get Conversation
            const conversation = await createConversation(ad.id, ad.owner_id);
            
            // 2. Send Message
            await sendMessage(conversation.id, messageText);
            
            toast.success("Mensagem enviada!");
            setMessageText("");
            navigate("/minha-conta"); // Go to chat
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao enviar mensagem: " + error.message);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#f6f8fb] flex flex-col font-sans">
                <Header />
                <div className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
                    <div className="text-gray-500">Carregando detalhes do anúncio...</div>
                </div>
                <Footer />
            </div>
        );
    }

    if (error || !ad) {
        return (
            <div className="min-h-screen bg-[#f6f8fb] flex flex-col font-sans">
                <Header />
                <div className="flex-1 container mx-auto px-4 py-12 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Anúncio não encontrado</h2>
                    <p className="text-gray-600 mb-4">O anúncio que você está procurando não existe ou foi removido.</p>
                    <Link to="/" className="text-viva-green font-bold hover:underline">Voltar para a Home</Link>
                </div>
                <Footer />
            </div>
        );
    }

    // Prepare display data
    const locationStr = `${ad.city ? ad.city + ' - ' : ''}${ad.state || ''}`;
    // Use Joined Profile Data if available, fallback to legacy
    const publisherName = ad.profiles?.name || "Anunciante"; 
    const userSince = new Date(ad.created_at).toLocaleDateString();

    // Default image if none
    // Ensure images is an array, sometimes JSONB comes as string or null
    const imagesArray = Array.isArray(ad.images) ? ad.images : [];
    const displayImages = imagesArray.length > 0 ? imagesArray : ["https://placehold.co/800x600?text=Sem+Imagem"];

    // Ensure activeImage index is valid
    const safeActiveImage = activeImage < displayImages.length ? activeImage : 0;
    const videoUrl = ad.attributes?.video_url ? String(ad.attributes.video_url) : "";

    const isEscortAd = Boolean(
        ad.attributes?.rate_1h ||
        ad.attributes?.rate_30m ||
        ad.attributes?.rate_2h ||
        ad.attributes?.ethnicity ||
        ad.attributes?.services ||
        ad.attributes?.age
    );

    const escortServiceColumns: string[][] = [
        [
            "Acompanhante",
            "Beijo na boca",
            "Festas e Eventos",
            "Inversão de papéis",
            "Massagem Tântrica",
            "Outras opções",
            "Striptease"
        ],
        [
            "Ativa",
            "Dominação",
            "Fetiche",
            "Massagem",
            "Namoradinha",
            "Passiva"
        ]
    ];

    const normalizeText = (value: string) =>
        value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    const normalizeToSet = (raw: any): Set<string> => {
        if (!raw) return new Set();
        if (Array.isArray(raw)) return new Set(raw.map((v) => normalizeText(String(v))));
        if (typeof raw === "string") {
            if (normalizeText(raw) === "todos") return new Set();
            return new Set(
                raw
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                    .map((v) => normalizeText(v))
            );
        }
        return new Set([normalizeText(String(raw))]);
    };

    const selectedServices = normalizeToSet(ad.attributes?.services);

    const formatMoneyInline = (value: any) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) return "-";
        return `R$${n.toLocaleString("pt-BR")}`;
    };

    const formatInlineValue = (value: any) => {
        if (value === undefined || value === null || value === "") return "-";
        if (Array.isArray(value)) return value.filter(Boolean).join(", ");
        return String(value);
    };

    return (
        <div className="min-h-screen bg-[#f6f8fb] flex flex-col font-sans text-gray-600">
            <Header />

            {/* Sticky Top Bar */}
            <div className={`fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-[9998] transform transition-transform duration-300 ${showStickyBar ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="container mx-auto px-4 py-2 flex items-center gap-4">
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-bold text-[#333] text-sm truncate">{ad.title}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                            <span className="whitespace-nowrap">R$ {ad.price?.toLocaleString('pt-BR')}</span>
                            <span>•</span>
                            <span className="truncate">{locationStr}</span>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (ad.profiles?.phone) {
                                    incrementListingClick(ad.id, 'whatsapp'); // Track phone click as whatsapp/contact
                                    window.location.href = `tel:${ad.profiles.phone}`;
                                    const btn = document.getElementById('sticky-phone-btn');
                                    if (btn) btn.innerText = ad.profiles.phone;
                                } else {
                                    toast.error("Telefone não disponível");
                                }
                            }}
                            id="sticky-phone-btn"
                            className="bg-[#76bc21] hover:bg-[#689F38] text-white font-bold py-1.5 px-4 rounded flex items-center gap-2 text-xs uppercase"
                        >
                            <Phone className="w-4 h-4" />
                            <span>Ver Telefone</span>
                        </button>
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowEmailModal(true);
                                setEmailStep(1);
                                setRobotChecked(false);
                            }}
                            className="bg-[#76bc21] hover:bg-[#689F38] text-white font-bold py-1.5 px-4 rounded flex items-center gap-2 text-xs uppercase"
                        >
                            <Mail className="w-4 h-4" />
                            <span>E-mail</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="bg-[#f6f8fb] text-[11px] py-3 px-4">
                <div className="container mx-auto flex items-center gap-1 text-gray-500 overflow-x-auto whitespace-nowrap">
                    <Link to="/" className="hover:underline">Classificados</Link>
                    <span>&gt;</span>
                    {/* <Link to={`/c/${ad.categorySlug}`} className="hover:underline capitalize">{ad.categorySlug}</Link> */}
                    <span className="text-gray-400 truncate max-w-[200px]">{ad.title}</span>
                </div>
            </div>

            <main className="flex-1 container mx-auto px-4 pb-12">
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* Left Column - Main Content */}
                    <div className="flex-1 min-w-0 space-y-4"> {/* Added space-y-4 for gap between boxes */}

                        {/* Box 1: Title, Price, Gallery */}
                        <div className="bg-white border border-gray-300 p-6 rounded-sm shadow-sm relative">
                            {/* Special Rate Box for Escorts */}
                            {ad.attributes?.rate_1h && (
                                <div className="absolute top-6 right-6 z-10 bg-white border-2 border-[#76bc21] rounded p-3 text-center shadow-md transform rotate-2">
                                    <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Cachê 1h</div>
                                    <div className="text-2xl font-black text-[#76bc21]">
                                        R$ {Number(ad.attributes.rate_1h).toLocaleString('pt-BR')}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-start mb-2">
                                <h1 className="text-[22px] font-bold text-[#333] leading-tight max-w-[70%]">{ad.title}</h1>
                                <button className="text-gray-400 hover:text-red-500 transition-colors ml-4">
                                    <Heart className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mb-4">
                                <span>Publicado por <a href="#" className="text-[#f90] hover:underline font-bold">{publisherName}</a> em: {new Date(ad.created_at).toLocaleDateString()}</span>
                                <span className="hidden sm:inline">-</span>
                                <span>{locationStr}</span>
                            </div>

                            <div className="text-[#76bc21] text-2xl font-bold mb-4">
                                R$ {ad.price?.toLocaleString('pt-BR')}
                            </div>

                            {/* Gallery */}
                            <div className="mb-2">
                                <div className="relative aspect-[4/3] bg-gray-200 mb-1 overflow-hidden cursor-pointer group rounded-sm">
                                    <img
                                        src={displayImages[safeActiveImage]}
                                        alt={ad.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 flex items-center gap-1 rounded">
                                        <Camera className="w-3 h-3" />
                                        <span>{safeActiveImage + 1}/{displayImages.length}</span>
                                    </div>
                                    {displayImages.length > 1 && (
                                        <>
                                            <button
                                                className="absolute left-0 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveImage((prev) => (prev - 1 + displayImages.length) % displayImages.length);
                                                }}
                                            >
                                                <ChevronRight className="w-8 h-8 rotate-180" />
                                            </button>
                                            <button
                                                className="absolute right-0 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveImage((prev) => (prev + 1) % displayImages.length);
                                                }}
                                            >
                                                <ChevronRight className="w-8 h-8" />
                                            </button>
                                        </>
                                    )}
                                </div>

                                {displayImages.length > 1 && (
                                    <div className="flex gap-1 overflow-x-auto">
                                        {displayImages.map((img: string, idx: number) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImage(idx)}
                                                className={`w-[75px] h-[56px] flex-shrink-0 border-2 ${safeActiveImage === idx ? 'border-[#f90]' : 'border-transparent hover:border-gray-300'}`}
                                            >
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {videoUrl && (
                                <div className="mt-4">
                                    <div className="aspect-video bg-black rounded-sm overflow-hidden">
                                        <video
                                            src={videoUrl}
                                            controls
                                            className="w-full h-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {isEscortAd ? (
                            <>
                                <div className="bg-white border border-gray-300 p-6 rounded-sm shadow-sm">
                                    <div className="grid grid-cols-[160px,1fr] gap-y-4 text-sm">
                                        <div className="font-bold text-[#333]">Estado</div>
                                        <div className="text-[#333]">
                                            {ad.state ? (
                                                <>
                                                    <div className="mb-1">{ad.state}</div>
                                                    {ad.city ? <div className="text-gray-600">{ad.city}</div> : null}
                                                </>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>

                                        <div className="font-bold text-[#333]">Eu sou</div>
                                        <div className="text-[#333]">{ad.attributes?.gender ? formatInlineValue(ad.attributes.gender) : <span className="text-gray-400">-</span>}</div>

                                        <div className="font-bold text-[#333]">Idade</div>
                                        <div className="text-[#333]">
                                            {ad.attributes?.age ? `${ad.attributes.age} anos` : <span className="text-gray-400">-</span>}
                                        </div>

                                        <div className="font-bold text-[#333]">Etnia</div>
                                        <div className="text-[#333]">
                                            {ad.attributes?.ethnicity && normalizeText(String(ad.attributes.ethnicity)) !== "todos"
                                                ? ad.attributes.ethnicity
                                                : <span className="text-gray-400">-</span>}
                                        </div>

                                        <div className="font-bold text-[#333]">Atendo</div>
                                        <div className="text-[#333]">
                                            {ad.attributes?.attends ? formatInlineValue(ad.attributes.attends) : <span className="text-gray-400">-</span>}
                                        </div>

                                        <div className="font-bold text-[#333]">Locais</div>
                                        <div className="text-[#333]">
                                            {ad.attributes?.locations
                                                ? formatInlineValue(ad.attributes.locations)
                                                : ad.attributes?.address
                                                    ? formatInlineValue(ad.attributes.address)
                                                    : <span className="text-gray-400">-</span>}
                                        </div>

                                        <div className="font-bold text-[#333]">Idiomas</div>
                                        <div className="text-[#333]">
                                            {ad.attributes?.languages ? formatInlineValue(ad.attributes.languages) : <span className="text-gray-400">-</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-300 p-6 rounded-sm shadow-sm">
                                    <div className="font-bold text-[#333]">
                                        Serviços que ofereço &amp; não ofereço
                                        <div className="text-[11px] font-normal text-gray-500 mt-1">(a combinar)</div>
                                    </div>
                                    <div className="border-t border-gray-200 mt-4 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2 text-sm">
                                        {escortServiceColumns.map((column, colIndex) => (
                                            <div key={colIndex} className="space-y-2">
                                                {column.map((service) => {
                                                    const enabled = selectedServices.has(normalizeText(service));
                                                    return (
                                                        <div key={service} className="flex items-center gap-2 text-[#333]">
                                                            {enabled ? (
                                                                <Check className="w-4 h-4 text-[#76bc21] flex-shrink-0" />
                                                            ) : (
                                                                <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                            )}
                                                            <span>{service}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-200 mt-4 pt-3 text-[11px] text-gray-500">
                                        Valores e detalhes dos serviços podem ser combinados diretamente com o anunciante.
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-300 p-6 rounded-sm shadow-sm">
                                    <div className="font-bold text-[#333] mb-4">Cachê</div>
                                    <div className="grid grid-cols-[1fr,120px] gap-y-3 text-sm text-[#333]">
                                        <div className="text-gray-600">30 minutos</div>
                                        <div className="text-right font-medium">{formatMoneyInline(ad.attributes?.rate_30m)}</div>
                                        <div className="text-gray-600">1 hora</div>
                                        <div className="text-right font-medium">{formatMoneyInline(ad.attributes?.rate_1h)}</div>
                                        <div className="text-gray-600">2 horas</div>
                                        <div className="text-right font-medium">{formatMoneyInline(ad.attributes?.rate_2h)}</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white border border-gray-300 p-6 rounded-sm shadow-sm">
                                <div className="grid grid-cols-[1fr,2fr] gap-y-4 text-sm">
                                    <div className="font-bold text-[#333]">Preço (Sem Pontuação)</div>
                                    <div className="font-bold text-[#333] text-lg">R$ {ad.price?.toLocaleString('pt-BR')}</div>

                                    <div className="font-bold text-[#333]">Estado</div>
                                    <div className="text-[#333]">
                                        {ad.state ? (
                                            <>
                                                <div className="mb-1">{ad.state}</div>
                                                {ad.city && <div>{ad.city} {ad.state.replace('Estado', '').trim()}</div>}
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ad.city || ''} ${ad.state || ''}`)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="block text-[#f90] hover:underline text-xs mt-1"
                                                >
                                                    Veja no google map
                                                </a>
                                            </>
                                        ) : (
                                            <span className="text-gray-400">Não informado</span>
                                        )}
                                    </div>

                                    {ad.attributes?.advertiser_type && (
                                        <>
                                            <div className="font-bold text-[#333]">Tipo de Anúncio</div>
                                            <div className="text-[#555]">{ad.attributes.advertiser_type === 'Particular' ? 'Particular Oferta' : 'Imobiliária Oferta'}</div>
                                        </>
                                    )}

                                    {ad.attributes?.property_type && (
                                        <>
                                            <div className="font-bold text-[#333]">Propriedade</div>
                                            <div className="text-[#555]">{ad.attributes.property_type}</div>
                                        </>
                                    )}

                                    {ad.attributes?.rooms && (
                                        <>
                                            <div className="font-bold text-[#333]">Dormitórios</div>
                                            <div className="text-[#555]">{ad.attributes.rooms}</div>
                                        </>
                                    )}

                                    {ad.attributes?.size && (
                                        <>
                                            <div className="font-bold text-[#333]">m²</div>
                                            <div className="text-[#555]">{ad.attributes.size} m²</div>
                                        </>
                                    )}

                                    {ad.price && ad.attributes?.size && Number(ad.attributes.size) > 0 && (
                                        <>
                                            <div className="font-bold text-[#333]">Preço/m²</div>
                                            <div className="text-[#555]">{Math.round(ad.price / Number(ad.attributes.size))} $/m²</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Box 3: Description */}
                        <div className="bg-white border border-gray-300 p-6 rounded-sm shadow-sm">
                            <h3 className="font-bold text-[#333] mb-4 text-sm uppercase border-b border-gray-200 pb-2">Descrição</h3>
                            <div className="text-[13px] text-[#333] whitespace-pre-line leading-relaxed font-sans mb-6">
                                {ad.description}
                            </div>
                            
                            {/* Info Bar (ID, User Since, Visits) - Moved here */}
                            <div className="flex flex-wrap gap-8 text-xs text-gray-500 pt-4 border-t border-gray-100">
                                <div className="font-bold">
                                    ID <span className="font-normal">{ad.id.slice(0, 8).toUpperCase()}</span>
                                </div>
                                <div className="font-bold">
                                    Usuário desde <span className="font-normal">{ad.profiles?.created_at ? new Date(ad.profiles.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                                </div>
                                <div className="font-bold">
                                    Visitas <span className="font-normal">{ad.analytics?.views || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* Box 4: Report Ad (Contextual) */}
                        <div className="bg-[#f9f9f9] border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between rounded-sm gap-4">
                            <div>
                                <h4 className="font-bold text-[#333] text-sm mb-1">Algo errado com este anúncio?</h4>
                                <p className="text-xs text-gray-500">Nos informe qual o problema e vamos verificar.</p>
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded text-xs font-bold text-[#333] hover:bg-gray-50 whitespace-nowrap">
                                <Flag className="w-3 h-3" />
                                Denunciar este anúncio
                            </button>
                        </div>

                    </div>

                    {/* Right Column - Sidebar (Static) */}
                    <div className="w-full lg:w-[320px] flex-shrink-0">
                        <div className="space-y-4"> {/* Removed sticky top-4 */}

                            {/* Contact Box */}
                            <div className="bg-white border border-gray-300 p-4 rounded-sm shadow-sm">
                                <h3 className="font-bold text-[#333] text-center mb-1 text-[15px]">Contatar anunciante</h3>
                                <p className="text-[11px] text-gray-500 text-center mb-4">Não esqueça de falar que me viu na FloripaLocal!</p>

                                <div className="space-y-3">
                                    {/* Chat Form directly here */}
                                    <div id="message-box" className="border border-gray-200 p-3 rounded bg-gray-50">
                                        <textarea 
                                            className="w-full p-2 text-sm border border-gray-300 rounded mb-2 h-24 focus:outline-none focus:border-viva-green"
                                            placeholder={currentUser ? "Olá, tenho interesse..." : "Faça login para enviar mensagem"}
                                            value={messageText}
                                            onChange={(e) => setMessageText(e.target.value)}
                                            disabled={!currentUser}
                                        />
                                        <button 
                                            onClick={handleContact}
                                            disabled={isSending || !currentUser}
                                            className="w-full bg-[#76bc21] hover:bg-[#689F38] text-white font-bold py-2 px-4 rounded-sm flex items-center justify-center gap-2 text-sm transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            <Mail className="w-5 h-5 fill-current" />
                                            {isSending ? "Enviando..." : "Enviar Mensagem"}
                                        </button>
                                        {!currentUser && (
                                            <Link to="/login" className="block text-center text-xs text-blue-600 mt-2 hover:underline">
                                                Entrar para contactar
                                            </Link>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => {
                                            if (ad.profiles?.phone) {
                                                alert(`Telefone: ${ad.profiles.phone}`);
                                            } else {
                                                alert("Telefone não disponível");
                                            }
                                        }}
                                        className="w-full bg-white border border-[#76bc21] text-[#76bc21] hover:bg-green-50 font-bold py-3 px-4 rounded-sm flex items-center justify-center gap-2 text-sm transition-colors shadow-sm"
                                    >
                                        <Phone className="w-5 h-5 fill-current" />
                                        Ver Telefone
                                    </button>

                                    <button 
                                        onClick={() => {
                                            if (ad.profiles?.phone) {
                                                incrementListingClick(ad.id, 'whatsapp');
                                                window.open(`https://wa.me/55${ad.profiles.phone.replace(/\D/g, '')}`, '_blank');
                                            } else {
                                                alert("WhatsApp não disponível");
                                            }
                                        }}
                                        className="w-full bg-white border border-[#76bc21] text-[#76bc21] hover:bg-green-50 font-bold py-3 px-4 rounded-sm flex items-center justify-center gap-2 text-sm transition-colors shadow-sm"
                                    >
                                        <MessageCircle className="w-5 h-5 fill-current" />
                                        WhatsApp
                                    </button>
                                </div>
                            </div>

                            {/* Safety Tips */}
                            <div className="bg-white border border-gray-300 p-4 rounded-sm shadow-sm text-[11px] text-[#666]">
                                <div className="flex items-center gap-2 mb-3 font-bold text-[#333]">
                                    <CheckCircle2 className="w-4 h-4 text-[#76bc21]" />
                                    Dicas de Segurança
                                </div>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Evite pagar antecipadamente, especialmente se for para o exterior.</li>
                                    <li>Nunca dê suas informações pessoais ou bancárias.</li>
                                    <li><a href="#" className="text-[#f90] hover:underline">Clique aqui para ver todas as dicas de segurança</a></li>
                                </ul>
                            </div>

                        </div>
                    </div>

                </div>
            </main>

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded shadow-lg max-w-md w-full relative">
                        <button
                            onClick={() => setShowEmailModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {emailStep === 1 ? (
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-[#333] mb-6">Envie uma mensagem</h2>
                                <p className="text-sm text-gray-600 mb-4">Insira seu endereço de email para entrar em contato com o anunciante</p>

                                <input
                                    type="email"
                                    placeholder="Insira seu email"
                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4 focus:outline-none focus:border-viva-green"
                                    value={visitorEmail}
                                    onChange={(e) => setVisitorEmail(e.target.value)}
                                />

                                <div className="border border-gray-300 rounded bg-[#f9f9f9] p-3 mb-4 flex items-center justify-between w-fit min-w-[240px]">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={robotChecked}
                                            onChange={(e) => setRobotChecked(e.target.checked)}
                                            className="h-5 w-5"
                                        />
                                        <span className="text-sm text-gray-700">Não sou um robô</span>
                                    </label>
                                    <div className="flex flex-col items-center text-[9px] text-gray-500 ml-4">
                                        <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="" className="w-5 h-5 opacity-50 mb-0.5" />
                                        <span>reCAPTCHA</span>
                                        <span className="text-[8px]">Privacidade - Termos</span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 mb-6">
                                    <input type="checkbox" id="tips" className="mt-1" />
                                    <label htmlFor="tips" className="text-xs text-gray-500">Receba dicas do FloripaLocal via email.</label>
                                </div>

                                <button
                                    onClick={() => {
                                        if (!visitorEmail) {
                                            toast.error("Por favor, insira seu email");
                                            return;
                                        }
                                        if (!robotChecked) {
                                            toast.error("Confirme que você não é um robô");
                                            return;
                                        }
                                        setEmailStep(2);
                                    }}
                                    className="w-full bg-[#76bc21] hover:bg-[#689F38] text-white font-bold py-3 rounded text-sm transition-colors"
                                >
                                    Email
                                </button>
                            </div>
                        ) : (
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-[#333] mb-4">Mande uma mensagem</h2>

                                <div className="flex items-center gap-2 mb-4 text-[#76bc21] font-bold text-sm">
                                    <Mail className="w-5 h-5" />
                                    <span>Email do anunciante</span>
                                </div>

                                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                                    Ao contactar este anunciante você está concordando com os <a href="#" className="text-blue-500 hover:underline">Termos e Condições</a> do FloripaLocal.
                                </p>

                                <button
                                    onClick={() => {
                                        const email = "contato@anunciante.com";
                                        window.location.href = `mailto:${email}?subject=Interesse no anúncio: ${ad.title}&body=Olá, vi seu anúncio no FloripaLocal...`;
                                        setShowEmailModal(false);
                                    }}
                                    className="w-full bg-[#76bc21] hover:bg-[#689F38] text-white font-bold py-3 rounded text-sm transition-colors mb-6 flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4" />
                                    Email
                                </button>

                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-center gap-2 mb-2 text-gray-700 font-bold text-sm">
                                        <div className="w-4 h-4 border-2 border-[#76bc21] rounded-full flex items-center justify-center text-[10px] text-[#76bc21]">L</div>
                                        <span>Economize tempo na próxima vez</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Tenha acesso ao email dos anunciantes acessando sua conta no FloripaLocal.
                                    </p>
                                    <Link
                                        to="/register"
                                        className="block w-full bg-[#76bc21] hover:bg-[#689F38] text-white font-bold py-3 rounded text-sm transition-colors text-center"
                                    >
                                        Crie uma conta
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
