import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Listing, Conversation, Message, Profile } from "@/types";
import { toast } from "sonner";
import { getMyListings, updateListing, getFavoriteListings, toggleFavorite } from "@/services/listings";
import { getMyConversations, getMessages, sendMessage } from "@/services/messages";
import { Eye, Edit, Mail, Phone } from "lucide-react";

// Mock Data Types
type Tab = 'overview' | 'ads' | 'chat' | 'favorites' | 'settings';

export default function UserDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Erro ao sair.");
        } else {
            toast.success("Você saiu da conta.");
            navigate("/login");
        }
    };

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setCurrentUserId(data.user.id);
                setUserEmail(data.user.email || null);
                
                // Fetch Profile
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single()
                    .then(({ data: profileData }) => {
                        if (profileData) setProfile(profileData);
                    });
            } else {
                navigate("/login");
            }
        });
    }, [navigate]);

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        const allowed: Tab[] = ["overview", "ads", "chat", "favorites", "settings"];

        if (tabParam && allowed.includes(tabParam as Tab)) {
            setActiveTab(tabParam as Tab);
            return;
        }

        if (location.pathname === "/meus-anuncios") {
            setActiveTab("ads");
        }
    }, [location.pathname, searchParams]);

    const selectTab = (tab: Tab) => {
        setActiveTab(tab);
        const next = new URLSearchParams(searchParams);
        next.set("tab", tab);
        setSearchParams(next, { replace: true });
    };

    // Fetch User Ads
    const { data: ads = [], refetch: refetchAds } = useQuery({
        queryKey: ['my_ads', currentUserId],
        queryFn: () => currentUserId ? getMyListings() : Promise.resolve([]),
        enabled: !!currentUserId
    });

    // Fetch Conversations
    const { data: conversations = [], refetch: refetchConversations } = useQuery({
        queryKey: ['my_conversations', currentUserId],
        queryFn: () => currentUserId ? getMyConversations() : Promise.resolve([]),
        enabled: !!currentUserId
    });

    // Fetch Favorites
    const { data: favorites = [], refetch: refetchFavorites } = useQuery({
        queryKey: ['my_favorites', currentUserId],
        queryFn: () => currentUserId ? getFavoriteListings() : Promise.resolve([]),
        enabled: !!currentUserId && activeTab === 'favorites'
    });

    // Sidebar Items
    const menuItems = [
        {
            id: 'overview', label: 'Visão Geral', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            )
        },
        {
            id: 'ads', label: 'Meus Anúncios', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            )
        },
        {
            id: 'favorites', label: 'Favoritos', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            )
        },
        {
            id: 'chat', label: 'Mensagens', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            )
        },
        {
            id: 'settings', label: 'Dados Pessoais', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            )
        },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 font-sans">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* SIDEBAR */}
                    <aside className="w-full md:w-64 bg-white rounded-lg shadow-sm border border-gray-200 h-fit">
                        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-500 font-bold text-xl">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    (profile?.name?.[0] || userEmail?.[0] || 'U').toUpperCase()
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="font-bold text-gray-900 truncate">{profile?.name || userEmail?.split('@')[0] || "Usuário"}</h3>
                                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                            </div>
                        </div>
                        <nav className="p-2">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => selectTab(item.id as Tab)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === item.id
                                        ? 'bg-green-50 text-viva-green'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors mt-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Sair
                            </button>
                        </nav>
                    </aside>

                    {/* MAIN CONTENT */}
                    <div className="flex-1">
                        {activeTab === 'overview' && <OverviewTab setActiveTab={selectTab} adsCount={ads.length} conversationsCount={conversations.length} />}
                        {activeTab === 'ads' && <MyAdsTab ads={ads} onUpdate={refetchAds} />}
                        {activeTab === 'chat' && <ChatTab conversations={conversations} currentUserId={currentUserId} />}
                        {activeTab === 'favorites' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-6">Meus Favoritos</h2>
                                {favorites.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        <p>Você ainda não salvou nenhum anúncio como favorito.</p>
                                        <Link to="/" className="inline-block mt-4 text-viva-green font-bold hover:underline">Explorar Anúncios</Link>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {favorites.map((ad) => (
                                            <div key={ad.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow relative">
                                                {/* Left Section: Info */}
                                                <div className="flex-1 p-4 flex flex-col sm:flex-row gap-4">
                                                    <Link 
                                                        to={`/anuncio/${ad.id}`}
                                                        className="w-32 h-24 bg-gray-100 rounded-md flex-shrink-0 bg-cover bg-center border border-gray-200 block hover:opacity-90 transition-opacity" 
                                                        style={{ backgroundImage: `url(${ad.images?.[0] || 'https://placehold.co/200x200?text=Sem+Foto'})` }}
                                                    ></Link>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-[#004e8a] text-lg mb-1 truncate hover:underline">
                                                            <Link to={`/anuncio/${ad.id}`}>{ad.title}</Link>
                                                        </h3>
                                                        
                                                        <div className="font-bold text-viva-green text-lg mb-2">
                                                            R$ {ad.price?.toLocaleString('pt-BR')}
                                                        </div>

                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            {ad.city || 'Cidade'} - {ad.state || 'Estado'}
                                                        </div>

                                                        <div className="flex items-center gap-4 pt-1 border-t border-gray-50">
                                                            <Link 
                                                                to={`/anuncio/${ad.id}`} 
                                                                className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                            >
                                                                Ver Detalhes
                                                            </Link>
                                                            <button 
                                                                onClick={async () => {
                                                                    try {
                                                                        await toggleFavorite(ad.id);
                                                                        refetchFavorites();
                                                                        toast.success("Removido dos favoritos");
                                                                    } catch(e) {
                                                                        toast.error("Erro ao remover");
                                                                    }
                                                                }}
                                                                className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                Remover
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'settings' && <SettingsTab profile={profile} onUpdate={() => window.location.reload()} />}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

// --- TAB COMPONENTS ---

const OverviewTab = ({ setActiveTab, adsCount, conversationsCount }: { setActiveTab: (t: Tab) => void, adsCount: number, conversationsCount: number }) => (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-viva-green transition-colors" onClick={() => setActiveTab('ads')}>
                <div className="text-3xl font-bold text-viva-green mb-1">{adsCount}</div>
                <div className="text-sm text-gray-600">Anúncios Criados</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:border-viva-green transition-colors" onClick={() => setActiveTab('chat')}>
                <div className="text-3xl font-bold text-blue-500 mb-1">{conversationsCount}</div>
                <div className="text-sm text-gray-600">Conversas</div>
            </div>
        </div>
    </div>
);

const MyAdsTab = ({ ads, onUpdate }: { ads: Listing[], onUpdate: () => void }) => {
    
    const toggleStatus = async (ad: Listing) => {
        const newStatus = ad.status === 'active' ? 'inactive' : 'active';
        try {
            await updateListing(ad.id, { status: newStatus });
            toast.success(`Anúncio ${newStatus === 'active' ? 'ativado' : 'pausado'}`);
            onUpdate();
        } catch (error) {
            toast.error("Erro ao atualizar status");
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Meus Anúncios ({ads.length})</h2>
                <Link to="/publicar-anuncio" className="bg-viva-green text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors">
                    Publicar Novo Anúncio
                </Link>
            </div>
            <div className="space-y-4">
                {ads.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        Você ainda não tem anúncios publicados.
                    </div>
                ) : (
                    ads.map((ad) => (
                        <div key={ad.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-md transition-shadow">
                            
                            {/* Left Section: Info & Status */}
                            <div className="flex-1 p-4 flex flex-col sm:flex-row gap-4 border-b md:border-b-0 md:border-r border-gray-100">
                                <div className="w-32 h-24 bg-gray-100 rounded-md flex-shrink-0 bg-cover bg-center border border-gray-200" style={{ backgroundImage: `url(${ad.images?.[0] || 'https://placehold.co/200x200?text=Sem+Foto'})` }}></div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-2.5 h-2.5 rounded-full ${ad.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        <span className="font-bold text-gray-700 text-sm">
                                            {ad.status === 'active' ? 'Publicado' : (ad.status === 'draft' ? 'Rascunho' : 'Pausado')}
                                        </span>
                                        <span className="text-xs text-gray-400">Expira em 29/01/26</span>
                                    </div>
                                    
                                    <div className="text-xs text-gray-400 mb-2">ID do anúncio: {ad.id.slice(0, 8)}...</div>
                                    
                                    <h3 className="font-bold text-gray-900 text-lg mb-2 truncate">{ad.title}</h3>
                                    
                                    {/* Stats Mock */}
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded text-blue-600">
                                            <Eye className="w-4 h-4" /> 117
                                        </div>
                                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded text-blue-600">
                                            <Mail className="w-4 h-4" /> 1
                                        </div>
                                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded text-blue-600">
                                            <Phone className="w-4 h-4" /> 2
                                        </div>
                                    </div>

                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {ad.city || 'Cidade'} &gt; {ad.state || 'Estado'}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2 justify-start">
                                    <Link
                                        to={`/anuncio/${ad.id}/editar`}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Editar"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </Link>
                                </div>
                            </div>

                            {/* Right Section: Promote (Disabled for now)
                            <div className="w-full md:w-[320px] bg-gray-50 p-6 flex flex-col items-center justify-center text-center border-l border-gray-100">
                                <p className="text-xs text-gray-500 mb-3">Você não tem planos ativos.</p>
                                <Link 
                                    to={`/anuncio/${ad.id}/promover`}
                                    className="bg-[#76bc21] hover:bg-[#689F38] text-white font-bold py-2.5 px-4 rounded shadow-sm transition-colors text-sm w-full"
                                >
                                    Adicione um plano de destaque
                                </Link>
                            </div>
                            */}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const ChatTab = ({ conversations, currentUserId }: { conversations: Conversation[], currentUserId: string | null }) => {
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [loadingSend, setLoadingSend] = useState(false);

    // Auto-refresh messages logic could go here (polling)

    const openConversation = async (id: string) => {
        setSelectedConversationId(id);
        try {
            const msgs = await getMessages(id);
            setMessages(msgs);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar mensagens");
        }
    };

    const handleSend = async () => {
        if (!selectedConversationId || !text.trim()) return;
        setLoadingSend(true);
        try {
            await sendMessage(selectedConversationId, text.trim());
            setText("");
            const msgs = await getMessages(selectedConversationId);
            setMessages(msgs);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao enviar mensagem");
        } finally {
            setLoadingSend(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex overflow-hidden">
            {/* Chat List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700">Conversas</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">Nenhuma conversa encontrada.</div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => openConversation(conv.id)}
                                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedConversationId === conv.id ? 'bg-green-50' : ''}`}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-sm text-gray-900">
                                        {conv.listing?.title || "Anúncio"}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {new Date(conv.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-viva-green mt-1">
                                    {conv.buyer_id === currentUserId ? 'Comprando' : 'Vendendo'}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col">
                {!selectedConversationId ? (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Selecione uma conversa para ver as mensagens.
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900 text-sm">
                                Chat
                            </h3>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4 flex flex-col">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUserId;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-3 rounded-lg max-w-[80%] text-sm shadow-sm ${isMe
                                                ? 'bg-viva-green text-white rounded-tr-none'
                                                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                                            }`}>
                                            {msg.body}
                                            <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 bg-white border-t border-gray-200">
                            <form
                                className="flex gap-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                            >
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Digite sua mensagem..."
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-viva-green"
                                />
                                <button
                                    type="submit"
                                    disabled={loadingSend || !text.trim()}
                                    className="bg-viva-green text-white p-2 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const SettingsTab = ({ profile, onUpdate }: { profile: Profile | null, onUpdate: () => void }) => {
    const [name, setName] = useState(profile?.name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            setName(profile.name || "");
            setPhone(profile.phone || "");
        }
    }, [profile]);

    const handleSave = async () => {
        if (!profile) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ name, phone })
                .eq('id', profile.id);

            if (error) throw error;
            toast.success("Perfil atualizado!");
            onUpdate();
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Dados Pessoais</h2>
            
            <div className="max-w-md space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-viva-green"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                    <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-viva-green"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-viva-green text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </div>
    );
};
