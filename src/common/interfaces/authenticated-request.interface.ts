import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';
import { Agency, HostProfile } from '../../database/entities';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  hostProfile?: HostProfile;
  agency?: Agency;
}
