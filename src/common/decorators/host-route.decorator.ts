import { SetMetadata } from '@nestjs/common';

export const HOST_ROUTE_KEY = 'isHostRoute';
export const HostRoute = () => SetMetadata(HOST_ROUTE_KEY, true);

export const AGENCY_ROUTE_KEY = 'isAgencyRoute';
export const AgencyRoute = () => SetMetadata(AGENCY_ROUTE_KEY, true);
