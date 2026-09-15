import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../models/auth.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  readonly mockUsers = this.authService.mockUsers;

  readonly identificador = signal<string>('c.rojas@nurys.cl');
  readonly contrasena = signal<string>('1234');
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);

  onLogin(): void {
    this.errorMessage.set(null);

    if (!this.identificador().trim() || !this.contrasena().trim()) {
      this.errorMessage.set('Por favor ingresa tu identificador (correo o RUT) y contraseña.');
      return;
    }

    this.isLoading.set(true);

    setTimeout(() => {
      const success = this.authService.login(this.identificador(), this.contrasena());
      this.isLoading.set(false);

      if (!success) {
        this.errorMessage.set('Credenciales inválidas. Usa uno de los accesos de prueba o revisa tu contraseña.');
      }
    }, 400);
  }

  selectQuickUser(user: User): void {
    this.identificador.set(user.identificadorAcceso);
    this.contrasena.set('1234');
    this.authService.loginAs(user);
  }
}
