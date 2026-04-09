type LoginPayload = {
    email: string;
    password: string;
};

type SignupPayload = {
    fullName: string;
    username: string;
    email: string;
    password: string;
};

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fakeLogin(payload: LoginPayload): Promise<{ success: boolean; message?: string }> {
    await sleep(600);
    if (!payload.email || !payload.password) {
        return { success: false, message: "Please fill in all fields." };
    }

    return { success: true };
}

export async function fakeSignup(payload: SignupPayload): Promise<{ success: boolean; message?: string }> {
    await sleep(700);

    if (!payload.email || !payload.password || !payload.fullName || !payload.username) {
        return { success: false, message: "Please fill in all fields." };
    }

    return { success: true };
}
