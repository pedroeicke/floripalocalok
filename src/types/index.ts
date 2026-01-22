export interface Category {
    id: string;
    name: string;
    slug: string;
}

export interface Profile {
    id: string;
    name: string | null;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
}

export interface Listing {
    id: string;
    title: string;
    description: string | null;
    price: number | null;
    category_id: string;
    type: string | null; // produto | serviço | emprego
    city: string | null;
    state: string | null;
    status: 'draft' | 'active' | 'inactive';
    owner_id: string;
    attributes: Record<string, any>;
    images: string[];
    created_at: string;
    analytics?: {
        views?: number;
        whatsapp_clicks?: number;
        email_clicks?: number;
    };
    profiles?: Profile; // Joined
}

export interface Conversation {
    id: string;
    listing_id: string;
    buyer_id: string;
    seller_id: string;
    created_at: string;
    listing?: Listing; // Joined
    buyer?: Profile; // Joined
    seller?: Profile; // Joined
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
}

// Alias for legacy compatibility (temporary)
export type Ad = Listing;
