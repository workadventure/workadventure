import { User } from "./User";

export interface BrothersFinder {
    /**
     * Returns the list of users in this room that share the same UUID
     */
    getBrothers(user: User): Iterable<User>;
}
