import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState, useEffect, ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getListingById, updateListing } from "@/services/listings";
import { toast } from "sonner";
import { Check, ArrowUp, ExternalLink, Palette, Star, LayoutGrid, Sparkles } from "lucide-react";

interface Plan {
    id: string;
    title: string;
    description: string;
    price: number;
    duration: string;
    icon: ReactNode;
    type: 'checkbox' | 'input';
}

export default function PromoteAdPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [durationDaysByPlan, setDurationDaysByPlan] = useState<Record<string, number>>({
        vip: 30,
        premium: 30
    });

    const { data: ad, isLoading } = useQuery({
        queryKey: ['ad', id],
        queryFn: () => getListingById(id || ""),
        enabled: !!id
    });

    useEffect(() => {
        if (!ad) return;
        const promotions: string[] = Array.isArray(ad.attributes?.promotions) ? ad.attributes.promotions : [];
        setSelectedPlans(promotions);
        if (typeof ad.attributes?.website_url === "string") {
            setWebsiteUrl(ad.attributes.website_url);
        }
        const tier = typeof ad.attributes?.plan_tier === "string" ? ad.attributes.plan_tier : "";
        const expires = typeof ad.attributes?.plan_expires_at === "string" ? ad.attributes.plan_expires_at : "";
        if ((tier === "vip" || tier === "premium") && expires) {
            const expMs = Date.parse(expires);
            if (Number.isFinite(expMs) && expMs > Date.now()) {
                const daysLeft = Math.max(1, Math.ceil((expMs - Date.now()) / (24 * 60 * 60 * 1000)));
                setDurationDaysByPlan((prev) => ({ ...prev, [tier]: daysLeft }));
            }
        }
    }, [ad]);

    const plans: Plan[] = [
        {
            id: 'vip',
            title: 'Anúncio VIP',
            description: 'Espaço dedicado com fotos grandes',
            price: 99.95,
            duration: '30 dias',
            type: 'checkbox',
            icon: <LayoutGrid className="w-10 h-10 text-orange-400" />
        },
        {
            id: 'premium',
            title: 'Anúncio Premium',
            description: 'Seu anúncio aparece acima dos que só têm a taxa de publicação.',
            price: 39.98,
            duration: '30 dias',
            type: 'checkbox',
            icon: <Star className="w-10 h-10 text-orange-400" />
        },
        {
            id: 'highlight',
            title: 'Coloque cor em seu anúncio',
            description: 'Seu anúncio aparece colorido de verde',
            price: 59.95,
            duration: '30 dias',
            type: 'checkbox',
            icon: <Palette className="w-10 h-10 text-green-500" />
        },
        {
            id: 'top_bump',
            title: 'Suba o seu anúncio / Ir para o topo',
            description: 'O seu anúncio sobe na listagem do site. O plano ilimitado permite subidas a cada 20min.',
            price: 129.95,
            duration: '30 dias ilimitado',
            type: 'checkbox',
            icon: <ArrowUp className="w-10 h-10 text-orange-400" />
        },
        {
            id: 'new_label',
            title: 'Opção: NOVO',
            description: 'Chame atenção para seu anúncio!',
            price: 69.00,
            duration: '30 dias',
            type: 'checkbox',
            icon: <Sparkles className="w-10 h-10 text-orange-400" />
        },
        {
            id: 'website_link',
            title: 'Link do seu site',
            description: 'Visitantes tem a opção de clicar e visitar seu site',
            price: 24.99,
            duration: '30 dias',
            type: 'input',
            icon: <ExternalLink className="w-10 h-10 text-blue-500" />
        }
    ];

    const togglePlan = (planId: string) => {
        setSelectedPlans(prev => 
            prev.includes(planId) 
                ? prev.filter(p => p !== planId)
                : [...prev, planId]
        );
    };

    const toggleAll = () => {
        if (selectedPlans.length === plans.length) {
            setSelectedPlans([]);
        } else {
            setSelectedPlans(plans.map(p => p.id));
        }
    };

    const total = plans
        .filter(p => selectedPlans.includes(p.id))
        .reduce((sum, p) => sum + p.price, 0);

    const isFreeTest = false;
    const totalDisplay = isFreeTest ? 0 : total;

    const handleCheckout = async () => {
        setIsSubmitting(true);
        try {
            if (!ad) throw new Error("Anúncio não encontrado");

            const selected = selectedPlans.slice();
            const tier = selected.includes("vip") ? "vip" : selected.includes("premium") ? "premium" : "normal";
            const durationDays = tier === "vip"
                ? (durationDaysByPlan.vip || 30)
                : tier === "premium"
                    ? (durationDaysByPlan.premium || 30)
                    : 0;

            const expiresAt = durationDays > 0
                ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
                : "";

            const nextPromotions = Array.from(new Set(selected));
            const nextAttributes = {
                ...(ad.attributes || {}),
                promotions: nextPromotions,
                website_url: nextPromotions.includes("website_link") ? websiteUrl : "",
                plan_tier: tier,
                plan_expires_at: expiresAt
            };

            await updateListing(ad.id, { attributes: nextAttributes });

            toast.success(isFreeTest ? "Plano ativado grátis (teste)!" : "Plano ativado!");
            navigate("/minha-conta?tab=ads");
        } catch (e: any) {
            console.error(e);
            toast.error("Erro ao ativar plano: " + (e?.message || "desconhecido"));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    }

    if (!ad) {
        return <div className="min-h-screen flex items-center justify-center">Anúncio não encontrado</div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 font-sans">
            <Header />
            
            {/* Top Bar */}
            <div className="bg-[#e0e0e0] border-b border-gray-300 py-3">
                <div className="container mx-auto px-4">
                    <h1 className="font-bold text-gray-700 text-lg">Aumente a visibilidade do seu anúncio</h1>
                </div>
            </div>

            <main className="flex-1 container mx-auto px-4 py-8">
                
                {/* Select All Box */}
                <div className="bg-white border border-gray-300 rounded p-6 mb-6 flex flex-col items-center justify-center text-center">
                    <div className="flex items-start gap-3">
                        <input 
                            type="checkbox" 
                            id="select_all"
                            className="mt-1 w-5 h-5 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                            checked={selectedPlans.length === plans.length}
                            onChange={toggleAll}
                        />
                        <div className="text-left">
                            <label htmlFor="select_all" className="font-bold text-gray-800 text-lg block cursor-pointer">
                                Selecionar todas as opções
                            </label>
                            <p className="text-sm text-gray-600">
                                Combine todas as opções para potencializar seus resultados
                            </p>
                        </div>
                    </div>
                </div>

                {/* Plans Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {plans.map(plan => (
                        <div key={plan.id} className="bg-white border border-gray-300 rounded p-6 flex gap-4 relative overflow-hidden">
                            <div className="pt-1">
                                <input 
                                    type="checkbox"
                                    className="w-5 h-5 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                                    checked={selectedPlans.includes(plan.id)}
                                    onChange={() => togglePlan(plan.id)}
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 text-lg mb-1">{plan.title}</h3>
                                <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{plan.description}</p>
                                
                                {plan.type === 'input' && selectedPlans.includes(plan.id) && (
                                    <input 
                                        type="text" 
                                        placeholder="http://www.seusite.com"
                                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                    />
                                )}

                                <div className="flex items-baseline gap-4">
                                    <span className="text-sm text-gray-500">
                                        {plan.id === "vip" || plan.id === "premium"
                                            ? `${durationDaysByPlan[plan.id] || 30} dias`
                                            : plan.duration}
                                    </span>
                                    <span className="text-xl font-bold text-[#76bc21]">
                                        R${plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {(plan.id === "vip" || plan.id === "premium") && selectedPlans.includes(plan.id) && (
                                    <div className="mt-3">
                                        <select
                                            className="border border-gray-300 rounded px-3 py-2 text-sm bg-white text-gray-700"
                                            value={durationDaysByPlan[plan.id] || 30}
                                            onChange={(e) => {
                                                const days = Number(e.target.value);
                                                setDurationDaysByPlan((prev) => ({ ...prev, [plan.id]: days }));
                                            }}
                                        >
                                            <option value={7}>7 dias</option>
                                            <option value={15}>15 dias</option>
                                            <option value={30}>30 dias</option>
                                            <option value={60}>60 dias</option>
                                            <option value={90}>90 dias</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            
                            {/* Icon/Illustration Area */}
                            <div className="w-24 flex-shrink-0 flex items-center justify-center border-l border-gray-100 pl-4">
                                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    {plan.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer / Checkout */}
                <div className="flex flex-col items-center justify-center gap-6 border-t border-gray-300 pt-8">
                    <div className="flex justify-between w-full max-w-2xl text-xl">
                        <span className="font-bold text-gray-700">Total</span>
                        <span className="font-bold text-gray-800">R${totalDisplay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <button 
                        onClick={handleCheckout}
                        disabled={isSubmitting}
                        className="w-full max-w-2xl bg-[#ff7f00] hover:bg-[#e67300] text-white font-bold py-4 rounded text-lg shadow-sm transition-colors disabled:opacity-70"
                    >
                        {isSubmitting ? 'Processando...' : (isFreeTest ? 'Ativar grátis (teste)' : 'Ir para minha conta')}
                    </button>
                </div>

            </main>
            <Footer />
        </div>
    );
}
