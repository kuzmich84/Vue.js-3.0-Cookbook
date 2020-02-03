import { API, graphqlOperation } from 'aws-amplify';
import { getUser as GetUser } from 'src/graphql/queries';
import { createUser, updateUser } from 'src/graphql/mutations';
import {
  singUp,
  validateUser,
  singIn,
  getCurrentAuthUser,
  changePassword,
} from 'driver/auth';
import MT from './types';

async function initialLogin({ commit }) {
  try {
    commit(MT.LOADING);

    const AuthUser = await getCurrentAuthUser();

    const { data } = await API.graphql(graphqlOperation(GetUser, { id: AuthUser.id }));
    commit(MT.SET_USER_DATA, data.getUser);

    return Promise.resolve(AuthUser);
  } catch (err) {
    commit(MT.ERROR, err);
    return Promise.reject(err);
  }
}

async function singUpNewUser({ commit }, {
  email = '',
  username = '',
  name = '',
  password = '',
}) {
  try {
    commit(MT.LOADING);

    const userData = await singUp({ username, password, email });

    commit(MT.CREATE_USER, {
      email,
      password,
      name,
      username,
    });

    return Promise.resolve(userData);
  } catch (err) {
    commit(MT.ERROR, err);
    return Promise.reject(err);
  }
}

async function createNewUser({ commit, dispatch, state }, code) {
  try {
    commit(MT.LOADING);
    const {
      email,
      username,
      name,
      password,
    } = state;
    const userData = await validateUser(email, code);

    await dispatch('singInUser', {
      email,
      password: window.atob(password),
    });

    const AuthUser = await getCurrentAuthUser();

    await API.graphql(graphqlOperation(
      createUser,
      {
        input: {
          id: AuthUser.username,
          username,
          email,
          name,
        },
      },
    ));

    commit(MT.USER_VALIDATED);

    return Promise.resolve(userData);
  } catch (err) {
    commit(MT.ERROR, err);
    return Promise.reject(err);
  }
}

async function singInUser({ commit, dispatch }, { email = '', password = '' }) {
  try {
    commit(MT.LOADING);

    await singIn(email, password);

    await dispatch('initialLogin');
  } catch (err) {
    commit(MT.ERROR);
  }
}

async function editUser({ commit, state }, {
  username = '',
  name = '',
  password = '',
  newPassword = '',
}) {
  try {
    commit(MT.LOADING);

    const updateObject = Object.assign({
      name: state.name,
      username: state.username,
    }, { name, username });

    const { data } = await API.graphql(graphqlOperation(updateUser,
      { input: { id: state.id, ...updateObject } }));

    if (password && newPassword) {
      await changePassword(password, newPassword);
    }

    commit(MT.SET_USER_DATA, data.updateUser);

    return Promise.resolve(data.updateUser);
  } catch (err) {
    return Promise.reject(err);
  }
}

export default {
  initialLogin,
  singUpNewUser,
  createNewUser,
  singInUser,
  editUser,
};
