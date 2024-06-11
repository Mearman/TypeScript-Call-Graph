import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '../common/data-types';

const client = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: '/trpc'
        })
    ]
});

client.getAnalysisResult.query().then(res => {
    document.getElementById('app')!.innerHTML = JSON.stringify(res);
});