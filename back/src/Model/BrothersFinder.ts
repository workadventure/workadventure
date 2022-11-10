import { User } from "./User.js";

export interface BrothersFinder {
    /**
     * Returns the list of users in this room that share the same UUID
     */
    getBrothers(user: User): Iterable<User>;
}
