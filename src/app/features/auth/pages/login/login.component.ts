import { Component, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, UpperCasePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Cuentas de demostración (sin contraseña) para los accesos rápidos. */
  readonly demoAccounts = this.authService.demoAccounts;

  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);

  /**
   * H1.1 — criterio 4: los campos se validan a nivel de código, no pueden
   * quedar nulos ni vacíos. `nonNullable` evita que los controles sean
   * `string | null`, y los Validators rechazan vacío/espacios y
   * contraseñas demasiado cortas antes de siquiera intentar el login.
   */
  readonly form = this.fb.nonNullable.group({
    identificadorAcceso: ['', [Validators.required, requiredTrimmedValidator]],
    contrasena: ['', [Validators.required, Validators.minLength(4)]],
  });

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const credentials = this.form.getRawValue();

    this.authService.login(credentials).subscribe((result) => {
      this.isLoading.set(false);

      if (!result.success) {
        this.errorMessage.set(result.message);
        return;
      }

      const returnUrl = this.resolveReturnUrl(
        this.route.snapshot.queryParamMap.get('returnUrl'),
        result.user,
      );
      this.router.navigateByUrl(returnUrl);
    });
  }

  /** Autocompleta el formulario con una cuenta de demo y lo envía. */
  selectQuickUser(user: User): void {
    this.form.setValue({
      identificadorAcceso: user.identificadorAcceso,
      contrasena: '1234',
    });
    this.submit();
  }

  /** Acepta únicamente rutas internas y evita un ciclo de regreso al login. */
  private resolveReturnUrl(returnUrl: string | null, user: User): string {
    if (
      !returnUrl ||
      !returnUrl.startsWith('/') ||
      returnUrl.startsWith('//') ||
      returnUrl === '/login' ||
      returnUrl.startsWith('/login?') ||
      !this.isRouteVisibleForRole(returnUrl, user)
    ) {
      return user.rol === 'bodeguero' ? '/product-master' : '/pos';
    }

    return returnUrl;
  }

  private isRouteVisibleForRole(route: string, user: User): boolean {
    if (user.rol === 'admin') {
      return true;
    }

    const visibleRoutes = user.rol === 'bodeguero'
      ? ['/home', '/product-master', '/inventario']
      : ['/home', '/pos', '/caja'];

    return visibleRoutes.some((visibleRoute) =>
      route === visibleRoute || route.startsWith(`${visibleRoute}/`),
    );
  }
}

function requiredTrimmedValidator(control: { value: string }) {
  return control.value?.trim().length > 0 ? null : { required: true };
}
