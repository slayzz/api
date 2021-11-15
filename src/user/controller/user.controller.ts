import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Pagination } from 'nestjs-typeorm-paginate';
import { catchError, map, Observable, of } from 'rxjs';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';
import * as path from 'path';

import { hasRoles } from 'src/auth/decorator/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from '../models/user.entity';

import { User } from '../models/user.interface';
import { UserService } from '../service/user.service';

export const storage = {
  storage: diskStorage({
    destination: './uploads/profileimages',
    filename: (req, file, cb) => {
      const filename =
        path.parse(file.originalname).name.replace(/\s/g, '') + uuidv4();
      const extension = path.parse(file.originalname).ext;

      cb(null, `${filename}${extension}`);
    },
  }),
};

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  create(@Body() user: User): Observable<User | unknown> {
    return this.userService.create(user).pipe(
      map((user: User) => user),
      catchError((err) => of({ error: err.message })),
    );
  }

  @Post('login')
  login(@Body() user: User): Observable<any> {
    return this.userService.login(user).pipe(
      map((jwt: string) => ({
        acess_token: jwt,
      })),
    );
  }

  @Get(':id')
  findOne(@Param() params): Observable<User> {
    return this.userService.findOne(Number(params.id));
  }

  @Get()
  index(
    @Query('page') page = 0,
    @Query('limit') limit = 10,
    @Query('username') username: string,
  ): Observable<Pagination<User>> {
    if (username === null || username === undefined) {
      return this.userService.paginate({
        limit: Number(limit),
        page: Number(page),
        route: 'http://localhost:3000/api/users',
      });
    } else {
      return this.userService.paginateFilterByUsername(
        {
          limit: Number(limit),
          page: Number(page),
          route: 'http://localhost:3000/api/users',
        },
        { username },
      );
    }
  }

  @Delete(':id')
  deleteOne(@Param() params): Observable<any> {
    return this.userService.deleteOne(Number(params.id));
  }

  @Put(':id')
  updateOne(@Param() params, @Body() user: User): Observable<any> {
    return this.userService.updateOne(Number(params.id), user);
  }

  @hasRoles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put(':id/role')
  updateRoleOfUser(
    @Param('id') id: string,
    @Body() user: User,
  ): Observable<User> {
    return this.userService.updateRoleOfUser(Number(id), user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', storage))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ): Observable<{ profileImage: string }> {
    const user = req.user.user;
    return this.userService
      .updateOne(user.id, {
        profileImage: file.filename,
      })
      .pipe(map((user: User) => ({ profileImage: user.profileImage })));
  }

  @Get('profile-image/:imagename')
  findProfileImage(@Param('imagename') imagename, @Res() res): Observable<any> {
    return of(
      res.sendFile(
        path.join(process.cwd(), 'uploads/profileimages/' + imagename),
      ),
    );
  }
}
