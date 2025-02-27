export type RequireOnlyOne<T, keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, keys>> &
    {
        [K in keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<keys, K>, undefined>>;
    }[keys];
