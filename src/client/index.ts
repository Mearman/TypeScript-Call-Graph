import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { AppRouter } from '../common/data-types';
import { AppComponent } from './components/AppComponent';

const client = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: '/trpc'
        })
    ]
});

const appRoot = document.getElementById('app')!;
const appComponent = new AppComponent();
appRoot.append(appComponent.getElement());
appComponent.ready();

client.getAnalysisResult.query().then(res => {
    appComponent.setCallGraph(res);
});