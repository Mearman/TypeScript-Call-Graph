/**
 * Even though this file is in src/common, it is actually just part of the server code.
 * It's just here so that the client can import the *type* definitions for the router.
 */
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import { CallGraph } from "../common/data-types.js";

export type Context = {
    callGraph: CallGraph
}

const t = initTRPC.context<Context>().create();

const router = t.router;
const publicProcedure = t.procedure;

export const appRouter = router({
    getAnalysisResult: publicProcedure
        .query(async (opts) => {
            const { input, ctx } = opts;
            return ctx.callGraph
        })
});

export type AppRouter = typeof appRouter;
