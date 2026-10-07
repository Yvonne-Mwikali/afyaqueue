import type { UserProfileRepository } from "@/features/users/user-profile-repository";

import { currentMockUser } from "./auth-service";

/**
 * Mock mode only: the profile is whatever the mock account was registered
 * or signed in with. No sample identity is invented.
 */
export const mockUserProfileRepository: UserProfileRepository = {
  watch: (uid, onChange) => {
    const user = currentMockUser();
    onChange(
      user && user.id === uid
        ? {
            uid,
            fullName: user.displayName,
            email: user.email,
            role: "patient",
            ...(user.phone ? { phone: user.phone } : {}),
          }
        : null
    );
    return () => undefined;
  },
};
