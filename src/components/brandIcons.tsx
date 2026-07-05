import type { SVGProps } from "react";
import type { TouchpointKind } from "../domain/types";

const sizeProps = {
  width: 14,
  height: 14,
  "aria-hidden": true,
} satisfies SVGProps<SVGSVGElement>;

/** Official Slack octothorpe (slack-edge.com brand assets). */
export function SlackBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" {...sizeProps} {...props}>
      <path
        d="M11.379 33.9993C11.379 37.1358 8.84512 39.6507 5.7276 39.6507C2.61008 39.6507 0.0572205 37.1168 0.0572205 33.9993C0.0572205 30.8817 2.5911 28.3479 5.70862 28.3479H11.36V33.9993H11.379Z"
        fill="#E01E5A"
      />
      <path
        d="M14.1962 33.9997C14.1962 30.8632 16.7301 28.3483 19.8476 28.3483C22.9651 28.3483 25.499 30.8822 25.499 33.9997V48.1353C25.499 51.2718 22.9651 53.7867 19.8476 53.7867C16.7301 53.7867 14.1962 51.2718 14.1962 48.1353V33.9997Z"
        fill="#E01E5A"
      />
      <path
        d="M19.8662 11.2673C16.7296 11.2673 14.2148 8.73347 14.2148 5.61594C14.2148 2.49842 16.7486 -0.0354538 19.8662 -0.0354538C22.9837 -0.0354538 25.5175 2.49842 25.5175 5.61594V11.2673H19.8662Z"
        fill="#36C5F0"
      />
      <path
        d="M19.8682 14.1334C23.0047 14.1334 25.5196 16.6673 25.5196 19.7848C25.5196 22.9023 22.9857 25.4362 19.8682 25.4362H5.67566C2.53916 25.4362 0.0242615 22.9023 0.0242615 19.7848C0.0242615 16.6673 2.55814 14.1334 5.67566 14.1334H19.8682Z"
        fill="#36C5F0"
      />
      <path
        d="M42.5323 19.7853C42.5323 16.6488 45.0662 14.1339 48.1837 14.1339C51.3012 14.1339 53.8351 16.6678 53.8351 19.7853C53.8351 22.9028 51.3012 25.4367 48.1837 25.4367H42.5323V19.7853Z"
        fill="#2EB67D"
      />
      <path
        d="M39.7126 19.7934C39.7126 22.9299 37.1787 25.4448 34.0612 25.4448C30.9436 25.4448 28.4098 22.911 28.4098 19.7934V5.61986C28.4098 2.48336 30.9436 -0.0315399 34.0612 -0.0315399C37.1787 -0.0315399 39.7126 2.48336 39.7126 5.61986V19.7934Z"
        fill="#2EB67D"
      />
      <path
        d="M34.0376 42.482C37.1741 42.482 39.689 45.0158 39.689 48.1334C39.689 51.2509 37.1552 53.7848 34.0376 53.7848C30.9201 53.7848 28.3862 51.2509 28.3862 48.1334V42.482H34.0376Z"
        fill="#ECB22E"
      />
      <path
        d="M34.0381 39.6507C30.9016 39.6507 28.3867 37.1168 28.3867 33.9993C28.3867 30.8818 30.9206 28.3479 34.0381 28.3479H48.2306C51.3671 28.3479 53.882 30.8818 53.882 33.9993C53.882 37.1168 51.3482 39.6507 48.2306 39.6507H34.0381Z"
        fill="#ECB22E"
      />
    </svg>
  );
}

/** Microsoft Teams app icon (Microsoft 365 product icon). */
export function TeamsBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 2228.833 2073.333" xmlns="http://www.w3.org/2000/svg" {...sizeProps} {...props}>
      <path
        fill="#5059C9"
        d="M1554.637,777.5h575.713c54.391,0,98.483,44.092,98.483,98.483c0,0,0,0,0,0v524.398 c0,199.901-162.051,361.952-361.952,361.952h0h-1.711c-199.901,0.028-361.975-162-362.004-361.901c0-0.017,0-0.034,0-0.052V828.971 C1503.167,800.544,1526.211,777.5,1554.637,777.5L1554.637,777.5z"
      />
      <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25" />
      <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917" />
      <path
        fill="#7B83EB"
        d="M1667.323,777.5H717.01c-53.743,1.33-96.257,45.931-95.01,99.676v598.105 c-7.505,322.519,247.657,590.16,570.167,598.053c322.51-7.893,577.671-275.534,570.167-598.053V877.176 C1763.579,823.431,1721.066,778.83,1667.323,777.5z"
      />
      <path
        fill="#FFF"
        d="M820.211,828.193H630.241v517.297H509.211V828.193H320.123V727.844h500.088V828.193z"
      />
    </svg>
  );
}

/** Microsoft Excel app icon (Microsoft 365 product icon). */
export function ExcelBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 2289.75 2130" xmlns="http://www.w3.org/2000/svg" {...sizeProps} {...props}>
      <path
        fill="#185C37"
        d="M1437.75,1011.75L532.5,852v1180.393c0,53.907,43.7,97.607,97.607,97.607l0,0h1562.036 c53.907,0,97.607-43.7,97.607-97.607l0,0V1597.5L1437.75,1011.75z"
      />
      <path
        fill="#21A366"
        d="M1437.75,0H630.107C576.2,0,532.5,43.7,532.5,97.607c0,0,0,0,0,0V532.5l905.25,532.5L1917,1224.75 L2289.75,1065V532.5L1437.75,0z"
      />
      <path fill="#107C41" d="M532.5,532.5h905.25V1065H532.5V532.5z" />
      <path
        fill="#FFF"
        d="M302.3,1382.264l205.332-318.169L319.5,747.683h151.336l102.666,202.35 c19.009,37.685,19.009,82.352,0,120.037L470.836,1272.42L302.3,1382.264z"
      />
      <path fill="#33C481" d="M2192.143,0H1437.75v532.5h852V97.607C2289.75,43.7,2246.05,0,2192.143,0L2192.143,0z" />
      <path fill="#107C41" d="M1437.75,1065h852v532.5h-852V1065z" />
    </svg>
  );
}

/** Google Meet app icon (Google Workspace product icon). */
export function GoogleMeetBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 87.5 72" fill="none" xmlns="http://www.w3.org/2000/svg" {...sizeProps} {...props}>
      <path fill="#00832d" d="M49.5 36l8.53 9.75 11.47 7.33 2-17.02-2-16.64-11.69 6.44z" />
      <path fill="#0066da" d="M0 51.5V66c0 3.315 2.685 6 6 6h14.5l3-10.96-3-9.54-9.95-3z" />
      <path fill="#e94235" d="M20.5 0L0 20.5l10.55 3 9.95-3 2.95-9.41z" />
      <path fill="#2684fc" d="M20.5 20.5H0v31h20.5z" />
      <path
        fill="#00ac47"
        d="M82.6 8.68L69.5 19.42v33.66l13.16 10.79c1.97 1.54 4.85.135 4.85-2.37V11c0-2.535-2.945-3.925-4.91-2.32zM49.5 36v15.5h-29V72h43c3.315 0 6-2.685 6-6V53.08z"
      />
      <path fill="#ffba00" d="M63.5 0h-43v20.5h29V36l20-16.57V6c0-3.315-2.685-6-6-6z" />
    </svg>
  );
}

/** Google Forms app icon (Google Workspace product icon). */
export function GoogleFormsBrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...sizeProps} {...props}>
      <path
        fill="#7248B9"
        d="M14.727 6h6l-6-6v6zm0 .727H14V0H4.91c-.905 0-1.637.732-1.637 1.636v20.728c0 .904.732 1.636 1.636 1.636h14.182c.904 0 1.636-.732 1.636-1.636V6.727h-6zM7.91 17.318a.819.819 0 1 1 .001-1.638.819.819 0 0 1 0 1.638zm0-3.273a.819.819 0 1 1 .001-1.637.819.819 0 0 1 0 1.637zm0-3.272a.819.819 0 1 1 .001-1.638.819.819 0 0 1 0 1.638zm9 6.409h-6.818v-1.364h6.818v1.364zm0-3.273h-6.818v-1.364h6.818v1.364zm0-3.273h-6.818V9.273h6.818v1.363z"
      />
    </svg>
  );
}

const BRAND_ICONS: Record<TouchpointKind, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  interview: GoogleMeetBrandIcon,
  teams: TeamsBrandIcon,
  excel: ExcelBrandIcon,
  slack: SlackBrandIcon,
  survey: GoogleFormsBrandIcon,
};

export function BrandIcon({ kind }: { kind: TouchpointKind }) {
  const Icon = BRAND_ICONS[kind];
  return <Icon />;
}
