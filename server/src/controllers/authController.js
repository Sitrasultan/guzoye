import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Guide from '../models/Guide.js';
import { ApiError } from '../middleware/errors.js';
import { issueSession, clearSession } from '../services/session.js';
const dummyHash = bcrypt.hashSync('not-a-user-password', 12);
export async function publicUser(user) {
  const guide = user.role === 'guide' ? await Guide.findOne({ user: user._id }).select('_id status rejectionReason image').lean() : null;
  return { _id: user._id, name: user.name, email: user.email, role: user.role, image: guide?.image || '', guide };
}
export async function register(req, res) {
  const { name, email, password, role } = req.validated;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email, password, role });
  try { if (role === 'guide') await Guide.create({ user: user._id, status: 'pending' }); }
  catch (error) { await User.deleteOne({ _id: user._id }); throw error; }
  issueSession(res, user);
  res.status(201).json({ data: { user: await publicUser(user) }, message: role === 'guide' ? 'Account created. Your guide application is pending admin approval.' : 'Welcome to Guzoye.' });
}
export async function login(req, res) {
  const { email, password } = req.validated;
  const user = await User.findOne({ email }).select('+password +tokenVersion');
  const matches = await bcrypt.compare(password, user?.password || dummyHash);
  if (!user || !matches || user.isActive === false) throw new ApiError(401, 'Invalid email or password.');
  issueSession(res, user); res.json({ data: { user: await publicUser(user) }, message: 'Welcome back.' });
}
export async function logout(req, res) {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } }); clearSession(res);
  res.json({ message: 'Logged out on all devices.' });
}
export async function me(req, res) { res.json({ data: { user: await publicUser(req.user) } }); }
