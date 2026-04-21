import React from "react";
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Link as LinkIcon,
  Users,
  Globe,
} from "lucide-react";

interface PostHeaderMenuProps {
  isOwnPost: boolean;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  showPrivacyMenu: boolean;
  setShowPrivacyMenu: (show: boolean) => void;
  setShowSpecificModal: (show: boolean) => void;
  setShowExcludedModal: (show: boolean) => void;
  onEdit: () => void;
  onChangePrivacy: (newPrivacy: string) => void;
  onDelete: () => void;
  onCopyLink: () => void;
}

const PostHeaderMenu: React.FC<PostHeaderMenuProps> = ({
  isOwnPost,
  showMenu,
  setShowMenu,
  showPrivacyMenu,
  setShowPrivacyMenu,
  setShowSpecificModal,
  setShowExcludedModal,
  onEdit,
  onChangePrivacy,
  onDelete,
  onCopyLink,
}) => {
  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 py-2 border dark:border-gray-700">
            {isOwnPost && (
              <>
                <button
                  onClick={onEdit}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>

                <button
                  onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
                >
                  <Globe className="w-4 h-4" />
                  Change privacy
                </button>

                {showPrivacyMenu && (
                  <div className="px-2 py-1 space-y-1">
                    <button
                      onClick={() => onChangePrivacy("PUBLIC")}
                      className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                    >
                      <Globe className="w-3 h-3" />
                      Public
                    </button>
                    <button
                      onClick={() => onChangePrivacy("FRIENDS")}
                      className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                    >
                      <Users className="w-3 h-3" />
                      Friends
                    </button>
                    <button
                      onClick={() => onChangePrivacy("ONLY_ME")}
                      className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                    >
                      <Globe className="w-3 h-3" />
                      Only me
                    </button>
                    <button
                      onClick={() => {
                        setShowPrivacyMenu(false);
                        setShowSpecificModal(true);
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                    >
                      <Users className="w-3 h-3" />
                      Specific friends
                    </button>
                    <button
                      onClick={() => {
                        setShowPrivacyMenu(false);
                        setShowExcludedModal(true);
                      }}
                      className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded dark:text-white flex items-center gap-2"
                    >
                      <Users className="w-3 h-3" />
                      Friends except
                    </button>
                  </div>
                )}

                <button
                  onClick={onDelete}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}

            <button
              onClick={onCopyLink}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 dark:text-white"
            >
              <LinkIcon className="w-4 h-4" />
              Copy link
            </button>

            <div className="border-t dark:border-gray-700 my-1" />

            <button
              onClick={() => setShowMenu(false)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PostHeaderMenu;
