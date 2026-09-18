import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // PostgREST local funciona correctamente con XHR; además evita el error
    // `Failed to execute 'fetch': Invalid value` del FetchBackend en Angular 22.
    provideHttpClient(withXhr(), withInterceptors([authInterceptor])),
  ],
};
