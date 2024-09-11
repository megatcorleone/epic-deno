// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import * as mod from "https://deno.land/std@0.224.0/dotenv/mod.ts";
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
    "Access-Control-Allow-Methods": "POST",
};

interface Place {
    name: string | null;
    city: string | null;
    isFeatured: boolean | null;
    isFavourite: boolean | null;
    park: string | null;
    description: string | null;
    longitude: number | null;
    latitude: number | null;
    category: string | null;
    imageName: string | null;
}

async function updatePlace(
    supabaseClient: SupabaseClient,
    id: number,
    item: Place,
) {
    for (const [key, value] of Object.entries(item)) {
        if (value) {
            const query = {
                [key]: value,
            };
            const { data: data, error } = await supabaseClient.from("landmark")
                .update(
                    query,
                ).eq("id", id).order("id", { ascending: true }).select("*");

            if (error) {
                throw error;
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
    }

    return errorNotFound();
}

function errorNotFound() {
    return new Response("No API Available", {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
    });
}

function errorNoParam() {
    return new Response("Bad Request, Man!", {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
    });
}

Deno.serve(async (req) => {
    const { method } = req;

    // This is needed if you're planning to invoke your function from a browser.
    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Create a Supabase client with the Auth context of the logged in user.

        await mod.load({ export: true });
        // console.log("SUPABASE_URL === ", Deno.env.get("SUPABASE_URL"));
        const supabaseClient = createClient(
            // Supabase API URL - env var exported by default.
            Deno.env.get("SUPABASE_URL") ?? "",
            // Supabase API ANON KEY - env var exported by default.
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            // Create client with Auth context of the user that called the function.
            // This way your row-level-security (RLS) policies are applied.
            {
                global: {
                    headers: {
                        Authorization: req.headers.get("Authorization")!,
                    },
                },
            },
        );

        // Create a URL object
        let id = null;
        let item = null;
        if (method === "POST") {
            const body = await req.json();
            id = body.id;
            item = body.item;
        }

        switch (true) {
            case id && method === "POST":
                return updatePlace(supabaseClient, id as number, item as Place);
            default:
                return errorNoParam();
        }
    } catch (error) {
        console.error(error);

        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
