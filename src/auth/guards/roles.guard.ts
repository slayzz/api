import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable, of } from 'rxjs';
import { User } from 'src/user/models/user.interface';
import { UserService } from 'src/user/service/user.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  canActivate(context: ExecutionContext): Observable<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    console.log('roels', roles);
    if (!roles) {
      return of(true);
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user.user;
    console.log('user', user);

    return this.userService.findOne(user.id).pipe(
      map((user) => {
        return user && roles.indexOf(user.role) > -1;
      }),
    );
  }
}
