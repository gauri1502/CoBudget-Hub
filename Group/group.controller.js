const model = require("./group.model");
const models = require("../user/user.model");
const validator = require("../helper/validation");

const splitCalculator = require("../helper/split");

/*
Create Group Function This function basically create new groups
Accepts: Group Name
         Group Description:
         Group Members
         Currency Type:
Validation: Group Name not empty
            Group Members present in DB
            Currency type INR, USD, EUR (for now)
*/
exports.createGroup = async (req, res) => {
  try {
    const newGroup = new model.Group(req.body);
    console.log(req.body);

    //Performing validation on the input
    if (
      validator.notNull(newGroup.groupName) &&
      validator.currencyValidation(newGroup.groupCurrency)
    ) {
      /*
            Split Json is used to store the user split value (how much a person owes)
            When the Group is created all members are assigned the split value as 0    
            */
      const splitJson = {};

      for (const user of newGroup.groupMembers) {
        //Validating the group Members exist in the DB
        const memberCheck = await validator.userValidation(user);
        if (!memberCheck) {
          const err = new Error("Invalid member id");
          err.status = 400;
          throw err;
        }

        //Adding user to the split Json and init with 0
        splitJson[user] = 0;
      }

      /*
            Split Json will now contain an json with user email as the key and the split amount (currently 0) as the value
            We now store this splitJson object to the newGroup model so it can be stored to DB directly
            */
      newGroup.split = splitJson;

      //Validating the group Owner exist in the DB
      const ownerCheck = await validator.userValidation(newGroup.groupOwner);
      if (!ownerCheck) {
        const err = new Error("Invalid owner id");
        err.status = 400;
        throw err;
      }

      const id = await model.Group.create(newGroup);
      res.status(200).json({
        status: "Success",
        message: "Group Creation Success",
        Id: id._id,
      });
    }
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

/*
View Group function 
This function is used to display the group details 
Accepts: Group Id 
Returns: Group Info 
*/
exports.viewGroup = async (req, res) => {
  try {
    const group = await model.Group.findOne({
      _id: req.body._id,
    });
    console.log(group);
    if (!group || req.body._id == null) {
      const err = new Error("Invalid Group Id");
      err.status = 400;
      throw err;
    }
    res.status(200).json({
      status: "Success",
      group: group,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

/*
Find all user group function
This function is basically to display the list of group that a user belongs
Accepts: user email ID
Validation: email Id present in DB
*/
exports.findUserGroup = async (req, res) => {
  try {
    const user = await models.User.findOne({
      emailId: req.body.emailId,
    });
    if (!user) {
      const err = new Error("User Id not found !");
      err.status = 400;
      throw err;
    }
    const groups = await model.Group.find({
      groupMembers: req.body.emailId,
    }).sort({
      $natural: -1, //to get the newest first
    });
    console.log(groups);
    res.status(200).json({
      status: "Success",
      groups: groups,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

/*
Edit Group Function
This function is to edit the already existing group to make changes.
Accepts: Group Id
        Modified group info
*/
exports.editGroup = async (req, res) => {
  try {
    const group = await model.Group.findOne({
      _id: req.body.id,
    });

    if (!group || req.body.id == null) {
      const err = new Error("Invalid Group Id");
      err.status = 400;
      throw err;
    }

    const editGroup = new model.Group(req.body);

    //Passing the existing split to the edit group
    editGroup.split = group.split;

    if (
      validator.notNull(editGroup.groupName) ||
      validator.currencyValidation(editGroup.groupCurrency)
    ) {
      for (const user of editGroup.groupMembers) {
        //Validation to check if the members exist in the DB
        const memberCheck = await validator.userValidation(user);
        if (!memberCheck) {
          const err = new Error("Invalid member id");
          err.status = 400;
          throw err;
        }

        //Check if a new group member is added to the group and missing in the split
        //split[0] is used since json is stored as an array in the DB - ideally there should only be one element in the split array hence we are using the index number
        if (!editGroup.split[0].hasOwnProperty(user)) {
          //adding the missing members to the split and init with value 0
          editGroup.split[0][user] = 0;
        }
      }

      //validation to check if the groupOwner exist in the DB
      const ownerCheck = await validator.userValidation(group.groupOwner);
      console.log(group.groupOwner);
      if (!ownerCheck) {
        const err = new Error("Invalid owner id");
        err.status = 400;
        throw err;
      }

      const update_response = await model.Group.updateOne(
        {
          _id: req.body.id,
        },
        {
          $set: {
            groupName: editGroup.groupName,
            groupDescription: editGroup.groupDescription,
            groupCurrency: editGroup.groupCurrency,
            groupMembers: editGroup.groupMembers,
            groupCategory: editGroup.groupCategory,
            split: editGroup.split,
          },
        }
      );
      res.status(200).json({
        status: "Success",
        message: "Group updated successfully!",
        response: update_response,
      });
    }
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

/*
Delete Group Function
This function is used to delete the existing group
Accepts: Group Id
Validation: exisiting group Id
*/
exports.deleteGroup = async (req, res) => {
  try {
    const group = await model.Group.findOne({
      _id: req.body.id,
    });

    if (!group) {
      const err = new Error("Invalid Group Id");
      err.status = 400;
      throw err;
    }
    const delete_group = await model.Group.deleteOne({
      _id: req.body.id,
    });
    res.status(200).json({
      message: "Group deleted successfully!",
      status: "Success",
      response: delete_group,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

/*
Make Settlement Function 
This function is used to make the settlements in the group 

*/
exports.makeSettlement = async (req, res) => {
  try {
    const reqBody = new model.Settlement(req.body);
    validator.notNull(reqBody.groupId);
    validator.notNull(reqBody.settleTo);
    validator.notNull(reqBody.settleFrom);
    validator.notNull(reqBody.settleAmount);
    validator.notNull(reqBody.settleDate);
    const group = await model.Group.findOne({
      _id: req.body.groupId,
    });
    if (!group) {
      const err = new Error("Invalid Group Id");
      err.status = 400;
      throw err;
    }

    group.split[0][req.body.settleFrom] += req.body.settleAmount;
    group.split[0][req.body.settleTo] -= req.body.settleAmount;

    const id = await model.Settlement.create(reqBody);
    const update_response = await model.Group.updateOne(
      { _id: group._id },
      { $set: { split: group.split } }
    );
    console.log(update_response);

    res.status(200).json({
      message: "Settlement successfully!",
      status: "Success",
      update: update_response,
      response: id,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};

/*
Add Split function 
This function is called when a new expense is added 
This function updates the member split amount present in the goroup 
Accepts groupId
        per person exp
        exp owner 
        exp members 
it will add split to the owner and deduct from the remaining members 
This function is not a direct API hit - it is called by add expense function 
*/
exports.addSplit = async (
  groupId,
  expenseAmount,
  expenseOwner,
  expenseMembers
) => {
  const group = await model.Group.findOne({
    _id: groupId,
  });
  group.groupTotal += expenseAmount;
  group.split[0][expenseOwner] += expenseAmount;
  expensePerPerson = expenseAmount / expenseMembers.length;
  expensePerPerson =
    Math.round((expensePerPerson + Number.EPSILON) * 100) / 100;
  //Updating the split values per user
  for (const user of expenseMembers) {
    group.split[0][user] -= expensePerPerson;
  }

  //Nullifying split - check if the group balance is zero else added the diff to owner
  let bal = 0;
  for (val of Object.entries(group.split[0])) {
    bal += val[1];
  }
  group.split[0][expenseOwner] -= bal;
  group.split[0][expenseOwner] =
    Math.round((group.split[0][expenseOwner] + Number.EPSILON) * 100) / 100;
  //Updating back the split values to the gorup
  return await model.Group.updateOne(
    {
      _id: groupId,
    },
    group
  );
};

/*
Clear Split function 
This function is used to clear the split caused due to a prev expense 
This is used guring edit expense or delete expense operation 
Works in the reverse of addSplit function 
*/
exports.clearSplit = async (
  groupId,
  expenseAmount,
  expenseOwner,
  expenseMembers
) => {
  const group = await model.Group.findOne({
    _id: groupId,
  });
  group.groupTotal -= expenseAmount;
  group.split[0][expenseOwner] -= expenseAmount;
  expensePerPerson = expenseAmount / expenseMembers.length;
  expensePerPerson =
    Math.round((expensePerPerson + Number.EPSILON) * 100) / 100;
  //Updating the split values per user
  for (const user of expenseMembers) {
    group.split[0][user] += expensePerPerson;
  }

  //Nullifying split - check if the group balance is zero else added the diff to owner
  let bal = 0;
  for (val of Object.entries(group.split[0])) {
    bal += val[1];
  }
  group.split[0][expenseOwner] -= bal;
  group.split[0][expenseOwner] =
    Math.round((group.split[0][expenseOwner] + Number.EPSILON) * 100) / 100;
  //Updating back the split values to the gorup
  return await model.Group.updateOne(
    {
      _id: groupId,
    },
    group
  );
};

/*
Group Settlement Calculator 
This function is used to calculate the balance sheet in a group, who owes whom 
Accepts : group Id 
return : group settlement details
*/
exports.groupBalanceSheet = async (req, res) => {
  try {
    const group = await model.Group.findOne({
      _id: req.body.id,
    });
    if (!group) {
      const err = new Error("Invalid Group Id");
      err.status = 400;
      throw err;
    }

    res.status(200).json({
      status: "Success",
      data: splitCalculator(group.split[0]),
    });
  } catch (err) {
    res.status(err.status || 500).json({
      message: err.message,
    });
  }
};
