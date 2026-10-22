declare module "perspective-transform" {
  type Projection = {
    coeffs: number[];
    transform(x: number, y: number): [number, number];
    transformInverse(x: number, y: number): [number, number];
  };
  export default function PerspectiveTransform(source: number[], destination: number[]): Projection;
}