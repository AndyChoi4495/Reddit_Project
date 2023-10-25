import React, { FormEvent, useState } from 'react';
import InputGroup from '../components/InputGroup';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useAuthDispatch, useAuthState } from '../context/auth';

const Login = () => {
    let router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<any>({});
    const { authenticated } = useAuthState();
    const dispatch = useAuthDispatch();

    if (authenticated) router.push('/');

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        try {
            const res = await axios.post('/auth/login', { password, username }, { withCredentials: true });

            dispatch('LOGIN', res.data?.user);

            router.push('/');
        } catch (error: any) {
            console.log(error);
            setErrors(error.response?.data || {});
        }
    };

    return (
        <div className="bg-white">
            <div className="flex flex-col items-center justify-center h-screen p-6">
                <div className="w-10/12 mx-auto md:w-96">
                    <h1 className="mb-2 text-lg font-medium ">Log In</h1>

                    <form onSubmit={handleSubmit}>
                        <InputGroup
                            placeholder="Username"
                            value={username}
                            setValue={setUsername}
                            error={errors.username}
                        />
                        <InputGroup
                            placeholder="Password"
                            value={password}
                            setValue={setPassword}
                            error={errors.password}
                        />
                        <button className="w-full py-2 mb-1 text-xs font-bold text-white uppercase bg-gray-400 border border-gray-400 rounded">
                            Log In
                        </button>
                    </form>
                    <small>
                        <div className="relative">
                            Register Yet?
                            <Link legacyBehavior href="/register">
                                <a className="ml-1 text-blue-500 uppercase">Register</a>
                            </Link>
                            <Link legacyBehavior href="/">
                                <a className=" absolute right-0 text-red-600 ">Go Home</a>
                            </Link>
                        </div>
                    </small>
                </div>
            </div>
        </div>
    );
};

export default Login;
