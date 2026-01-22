import { supabase } from "@/lib/supabaseClient";
import { Listing } from "@/types";

export async function createListing(listing: Partial<Listing>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
        .from('listings')
        .insert({
            ...listing,
            owner_id: user.id,
            status: 'draft',
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateListing(id: string, updates: Partial<Listing>) {
    const { data, error } = await supabase
        .from('listings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getListingById(id: string): Promise<Listing | null> {
    const { data, error } = await supabase
        .from('listings')
        .select(`
            *,
            profiles:owner_id (
                name,
                phone,
                avatar_url
            )
        `)
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

export async function getMyListings(): Promise<Listing[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export interface SearchParams {
    categoryId?: string;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    attributes?: Record<string, any>;
}

export async function searchListings(params: SearchParams): Promise<Listing[]> {
    const { data, error } = await supabase.rpc('search_listings', {
        p_category_id: params.categoryId || null,
        p_city: params.city || null,
        p_price_min: params.minPrice || null,
        p_price_max: params.maxPrice || null,
        p_attrs: params.attributes || {}
    });

    if (error) {
        console.error("RPC Error:", error);
        return [];
    }
    return data || [];
}

export async function uploadListingImage(file: File, listingId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Path: {user_id}/{listing_id}/{timestamp}-{filename}
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${listingId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

    return publicUrl;
}

export async function uploadListingVideo(file: File, listingId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const fileExt = file.name.split('.').pop();
    const fileName = `video-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${listingId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, file, { contentType: file.type || undefined });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

    return publicUrl;
}

// Favorites Functions
export async function toggleFavorite(listingId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Check if already favorited
    const { data: existing, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle();

    if (existing) {
        // Remove
        const { error: deleteError } = await supabase
            .from('favorites')
            .delete()
            .eq('id', existing.id);
            
        if (deleteError) throw deleteError;
        
        return false; // Not favorited anymore
    } else {
        // Add
        const { error: insertError } = await supabase
            .from('favorites')
            .insert({
                user_id: user.id,
                listing_id: listingId
            });
            
        if (insertError) throw insertError;
        
        return true; // Favorited
    }
}

export async function getFavorites(): Promise<string[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', user.id);

    return data?.map(f => f.listing_id) || [];
}

export async function getFavoriteListings(): Promise<Listing[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('favorites')
        .select(`
            listing:listing_id (
                *,
                profiles:owner_id (
                    name,
                    phone,
                    avatar_url
                )
            )
        `)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error fetching favorite listings:", error);
        return [];
    }

    // Map the nested result back to a flat Listing array
    // @ts-ignore
    return data?.map(item => item.listing).filter(Boolean) || [];
}

export async function incrementListingView(id: string) {
    // Try RPC first if available (safer for concurrency)
    const { error } = await supabase.rpc('increment_listing_counter', {
        listing_id: id,
        counter_type: 'view'
    });

    if (error) {
        console.warn("RPC increment_listing_counter failed, falling back.", error);
        // Fallback for JSONB update without RPC is hard to do atomically client-side without risk
        // We will just read-modify-write
        const { data } = await supabase.from('listings').select('analytics').eq('id', id).single();
        const analytics = data?.analytics || {};
        const views = (analytics.views || 0) + 1;
        await supabase.from('listings').update({ 
            analytics: { ...analytics, views } 
        }).eq('id', id);
    }
}

export async function incrementListingClick(id: string, type: 'whatsapp' | 'email') {
    const { error } = await supabase.rpc('increment_listing_counter', {
        listing_id: id,
        counter_type: type
    });

    if (error) {
         console.warn("RPC increment_listing_counter failed, falling back.", error);
         const key = type === 'whatsapp' ? 'whatsapp_clicks' : 'email_clicks';
         const { data } = await supabase.from('listings').select('analytics').eq('id', id).single();
         const analytics = data?.analytics || {};
         const current = (analytics[key] || 0) + 1;
         await supabase.from('listings').update({ 
            analytics: { ...analytics, [key]: current } 
         }).eq('id', id);
    }
}
