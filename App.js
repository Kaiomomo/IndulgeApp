import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Profile from './screens/Profile';


import HomeScreen from './screens/HomeScreen';
import CreateGroup from './screens/CreateGroup';
import JoinGroup from './screens/JoinGroup';
import GroupEdit from './screens/GroupEdit';
import SignUp from './screens/SignUp';
import AlreadyAccount from './screens/AlreadyAccount';
import ForgotPassword from './screens/ForgotPassword';


const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CreateGroup" component={CreateGroup} />
        <Stack.Screen name ="GroupEdit" component={GroupEdit}/>
        <Stack.Screen name="JoinGroup" component={JoinGroup} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="AlreadyAccount" component={AlreadyAccount} /> 
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />


      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
