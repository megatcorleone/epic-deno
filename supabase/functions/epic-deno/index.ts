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

interface CommonError {
  message: string;
  statusCode: number;
}

async function getPlaceByName(supabaseClient: SupabaseClient, id: number) {
  const { data: task, error } = await supabaseClient.from("landmark").select(
    "*",
  ).eq("id", id).order("id");

  if (error) throw error;

  if (task.length === 0) {
    return new Response(null, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  }

  return new Response(JSON.stringify(task), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function getAllPlaces(supabaseClient: SupabaseClient) {
  const { data: tasks, error } = await supabaseClient.from("landmark").select(
    "*",
  ).order("id");
  if (error) throw error;

  if (tasks.length === 0) {
    return new Response(null, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
    });
  }
  return new Response(JSON.stringify(tasks), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function commonError(err: CommonError) {
  return new Response(err.message, {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: err.statusCode,
  });
}

Deno.serve(async (req) => {
  const { method } = req;

  // This is needed if you're planning to invoke your function from a browser.
  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await mod.load({ export: true });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    let id = null;
    try {
      const body = await req.json();
      if (body && (method === "POST" || method === "PUT")) {
        if (body.id) {
          id = body.id;
        }
      }
      // deno-lint-ignore no-unused-vars
    } catch (error) {
      const res: CommonError = {
        message: "Bad Request!!!",
        statusCode: 400,
      };
      return commonError(res);
    }

    const res: CommonError = {
      message: "Method Not Allowed!!!",
      statusCode: 405,
    };

    switch (true) {
      case id && method === "POST":
        return getPlaceByName(supabaseClient, id);
      case method === "POST":
        return getAllPlaces(supabaseClient);
      default:
        return commonError(res);
    }
  } catch (error) {
    console.error(error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
