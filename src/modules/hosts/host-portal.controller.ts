import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountTypes, CurrentHost, CurrentUser, RequestMeta, RequestMetaDto } from '../../common/decorators';
import { AccountType, ComplaintType } from '../../common/enums';
import { JwtPayload } from '../../common/interfaces';
import { HostGuard } from '../../common/guards';
import { HostProfile } from '../../database/entities';
import { HostsService } from './hosts.service';
import { RoomsService } from '../rooms/rooms.service';
import { ComplaintsService } from '../complaints/complaints.service';
import { SosService } from '../sos/sos.service';
import { SalaryService } from '../salary/salary.service';
import {
  CreateReportDto,
  CreateRoomDto,
  CreateSosDto,
  ResetPinDto,
  RoomBackgroundDto,
  RoomUserDto,
  SalaryPinDto,
  SalaryViewDto,
} from '../euro/dto/core.dto';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MailService } from '../../infrastructure/mail/mail.service';
import { generateNumericOtp, hashToken } from '../../common/utils';
import { UsersService } from '../users/users.service';
import { BanService } from '../users/ban.service';
import { ConfigService } from '@nestjs/config';
import { Environment } from '../../common/enums';
import { Logger } from '@nestjs/common';
import { AppException } from '../../common/exceptions';
import { HttpStatus } from '@nestjs/common';

@ApiTags('Host Portal')
@ApiBearerAuth()
@AccountTypes(AccountType.USER)
@UseGuards(HostGuard)
@Controller('host')
export class HostPortalController {
  private readonly logger = new Logger(HostPortalController.name);

  constructor(
    private readonly hosts: HostsService,
    private readonly rooms: RoomsService,
    private readonly complaints: ComplaintsService,
    private readonly sos: SosService,
    private readonly salary: SalaryService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly users: UsersService,
    private readonly bans: BanService,
    private readonly config: ConfigService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Host dashboard without salary amounts' })
  async dashboard(@CurrentHost() host: HostProfile) {
    const rooms = await this.rooms.listForHost(host.id);
    const flags = host.user ? await this.bans.decorate(host.user) : null;
    return {
      host: this.hosts.toPublic(host),
      rooms,
      liveBanned: flags?.liveBanned ?? false,
      liveBannedUntil: flags?.liveBannedUntil ?? null,
      idBanned: flags?.idBanned ?? false,
      idBannedUntil: flags?.idBannedUntil ?? null,
    };
  }

  @Post('rooms')
  @ApiOperation({ summary: 'Go live / create a room (403 if live-banned)' })
  createRoom(@CurrentHost() host: HostProfile, @Body() dto: CreateRoomDto) {
    return this.rooms.create(host, dto.title);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'List this host\'s rooms' })
  listRooms(@CurrentHost() host: HostProfile) {
    return this.rooms.listForHost(host.id);
  }

  @Post('rooms/:id/background')
  @ApiOperation({ summary: 'Set room wallpaper from catalog type wallpaper' })
  background(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentHost() host: HostProfile,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: RoomBackgroundDto,
  ) {
    return this.rooms.setBackground(id, host, dto.catalogItemId, actor);
  }

  @Post('rooms/:id/staff')
  @ApiOperation({ summary: 'Add mute-only room admin' })
  addStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentHost() host: HostProfile,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: RoomUserDto,
  ) {
    return this.rooms.addStaff(id, host, dto.userId, actor);
  }

  @Delete('rooms/:id/staff/:userId')
  @ApiOperation({ summary: 'Remove a room admin' })
  removeStaff(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentHost() host: HostProfile,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.rooms.removeStaff(id, host, userId, actor);
  }

  @Post('rooms/:id/kick')
  @ApiOperation({ summary: 'Kick a user (403 if target is Official)' })
  kick(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentHost() host: HostProfile,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: RoomUserDto,
  ) {
    return this.rooms.kick(id, host, dto.userId, dto.reason ?? 'kick', actor);
  }

  @Post('rooms/:id/blacklist')
  @ApiOperation({ summary: 'Blacklist a user (403 if target is Official)' })
  blacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentHost() host: HostProfile,
    @CurrentUser() actor: JwtPayload,
    @Body() dto: RoomUserDto,
  ) {
    return this.rooms.blacklist(id, host, dto.userId, dto.reason ?? 'blacklist', actor);
  }

  @Delete('rooms/:id/blacklist/:userId')
  @ApiOperation({ summary: 'Remove a user from room blacklist' })
  unblacklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentHost() host: HostProfile,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.rooms.unblacklist(id, host, userId, actor);
  }

  @Post('complaints')
  @ApiOperation({ summary: 'Host files a complaint / report' })
  createComplaint(
    @CurrentHost() host: HostProfile,
    @Body() dto: CreateReportDto,
  ) {
    return this.complaints.create({
      type: dto.type ?? ComplaintType.HOST_COMPLAINT,
      reporterId: host.userId,
      reporterType: 'host',
      targetId: dto.targetId,
      targetType: dto.targetType ?? 'user',
      summary: dto.summary,
      severity: dto.severity,
      evidence: dto.evidence,
      protectionLock: dto.protectionLock,
    });
  }

  @Get('complaints')
  @ApiOperation({ summary: 'Host complaint list' })
  listComplaints(@CurrentHost() host: HostProfile) {
    return this.complaints.listForHost(host);
  }

  @Post('sos')
  @ApiOperation({ summary: 'Raise SOS (also turns on Host Protection Lock)' })
  sosCreate(@CurrentHost() host: HostProfile, @Body() dto: CreateSosDto) {
    return this.sos.create(host, dto);
  }

  @Get('sos')
  @ApiOperation({ summary: 'Host SOS list with trail' })
  sosList(@CurrentUser() user: JwtPayload) {
    return this.sos.listForHost(user.sub);
  }

  @Post('salary/pin')
  @ApiOperation({ summary: 'Set or change salary PIN (first set needs no currentPin)' })
  setPin(@CurrentHost() host: HostProfile, @Body() dto: SalaryPinDto) {
    return this.hosts.setSalaryPin(host.id, dto.pin, dto.currentPin);
  }

  @Post('salary/view')
  @ApiOperation({ summary: 'PIN-gated host salary page' })
  async viewSalary(@CurrentHost() host: HostProfile, @Body() dto: SalaryViewDto) {
    await this.hosts.verifySalaryPin(host.id, dto.pin);
    return this.salary.hostSalary(host.id);
  }

  @Post('salary/pin/forgot')
  @ApiOperation({ summary: 'Email OTP to reset salary PIN' })
  async forgotPin(@CurrentHost() host: HostProfile) {
    const user = await this.users.findById(host.userId);
    if (!user.email) {
      throw new AppException('Host email is required for PIN recovery', HttpStatus.BAD_REQUEST);
    }
    const otp = generateNumericOtp(6);
    await this.redis.setJson(
      `salary-pin:${user.email.toLowerCase()}`,
      { otpHash: hashToken(otp), hostId: host.id },
      600,
    );
    try {
      await this.mail.send({
        to: user.email,
        subject: 'King Live salary PIN reset code',
        text: `Your salary PIN reset code is ${otp}. It expires in 10 minutes.`,
      });
    } catch {
      const env = this.config.get<string>('app.env');
      if (env === Environment.Production) {
        throw new AppException('Could not send PIN reset email', HttpStatus.BAD_GATEWAY);
      }
    }
    if (this.config.get<string>('app.env') !== Environment.Production) {
      this.logger.log(`Salary PIN OTP for ${user.email}: ${otp}`);
    }
    return { sent: true, expiresInSeconds: 600 };
  }

  @Post('salary/pin/reset')
  @ApiOperation({ summary: 'Reset salary PIN with email OTP' })
  async resetPin(@CurrentHost() host: HostProfile, @Body() dto: ResetPinDto) {
    const user = await this.users.findById(host.userId);
    const key = `salary-pin:${(user.email ?? '').toLowerCase()}`;
    const stored = await this.redis.getJson<{ otpHash: string; hostId: string }>(key);
    if (!stored || stored.hostId !== host.id || stored.otpHash !== hashToken(dto.otp)) {
      throw new AppException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }
    await this.redis.del(key);
    return this.hosts.resetSalaryPin(host.id, dto.pin);
  }
}
